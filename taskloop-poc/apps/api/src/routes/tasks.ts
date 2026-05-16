import { Router } from "express";
import { taskAgent } from "../agents/task-agent";
import { validationAgent } from "../agents/validation-agent";
import { createEntityId, createTask, getTaskById, listTasks, saveTask } from "../store/memory";
import { payoutService } from "../services/payout-service";
import { telegramService } from "../services/telegram";
import type {
  ApiErrorBody,
  ApproveTaskInput,
  CreateTaskInput,
  PayoutTaskInput,
  Submission,
  SubmitTaskInput,
  Task,
} from "../types";

export const tasksRouter = Router();

tasksRouter.get("/", (_req, res) => {
  res.json({ tasks: listTasks() });
});

tasksRouter.post("/", (req, res) => {
  const input = parseCreateTaskInput(req.body);
  if ("error" in input) {
    return res.status(400).json({ error: input.error } satisfies ApiErrorBody);
  }

  const task = createTask(input);
  return res.status(201).json({ task });
});

tasksRouter.get("/:id", (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found." } satisfies ApiErrorBody);
  }

  return res.json({ task });
});

tasksRouter.post("/:id/send", async (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found." } satisfies ApiErrorBody);
  }

  if (task.status !== "created") {
    return res.status(409).json({
      error: `Task must be in \"created\" status before sending. Current status: ${task.status}.`,
    } satisfies ApiErrorBody);
  }

  const preparation = await taskAgent.prepareDistribution({ task });
  const receipt = await telegramService.sendTask(task, preparation);

  task.status = "sent";
  task.telegramDelivered = receipt.recipientCount;
  task.distribution = {
    ...preparation,
    ...receipt,
  };

  const savedTask = saveTask(task);
  return res.json({
    task: savedTask,
    distribution: savedTask.distribution,
  });
});

tasksRouter.post("/:id/submit", (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found." } satisfies ApiErrorBody);
  }

  if (!["sent", "submitted"].includes(task.status)) {
    return res.status(409).json({
      error: `Task must be in \"sent\" or \"submitted\" status before receiving submissions. Current status: ${task.status}.`,
    } satisfies ApiErrorBody);
  }

  const input = parseSubmitTaskInput(req.body);
  if ("error" in input) {
    return res.status(400).json({ error: input.error } satisfies ApiErrorBody);
  }

  const submission: Submission = {
    id: createEntityId("sub"),
    user: input.user.trim(),
    handle: cleanOptionalString(input.handle),
    walletAddress: cleanOptionalString(input.walletAddress),
    response: input.response.trim(),
    submittedAt: new Date().toISOString(),
    validation: "pending",
    payout: "pending",
  };

  task.submissions.unshift(submission);
  task.status = "submitted";

  const savedTask = saveTask(task);
  return res.status(201).json({
    task: savedTask,
    submission,
  });
});

tasksRouter.post("/:id/approve", async (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found." } satisfies ApiErrorBody);
  }

  if (!["submitted", "approved"].includes(task.status)) {
    return res.status(409).json({
      error: `Task must be in \"submitted\" status before approval. Current status: ${task.status}.`,
    } satisfies ApiErrorBody);
  }

  const input = (req.body ?? {}) as ApproveTaskInput;
  const submission = findSubmission(task, input.submissionId, (item) => item.validation === "pending");

  if (!submission) {
    return res.status(404).json({
      error: "Pending submission not found for this task.",
    } satisfies ApiErrorBody);
  }

  const validation = await validationAgent.validate({ task, submission });
  submission.validation = validation.approved ? "approved" : "rejected";
  submission.validationScore = validation.score;
  submission.validationReason = validation.reason;

  let payoutError: string | undefined;
  let payout;

  if (validation.approved) {
    submission.payout = "processing";

    try {
      if (input.simulatePayoutFailure === true) {
        throw new Error("Simulated payout failure for retry validation.");
      }

      payout = await payoutService.payoutSubmission(task, submission);
      applyPayoutResult(task, submission, payout);
    } catch (error) {
      submission.payout = "pending";
      task.status = "approved";
      payoutError = error instanceof Error ? error.message : "Automatic payout failed after validation.";
      console.error("Automatic payout failed after approval.", error);
    }
  } else {
    task.status = task.submissions.some((item) => item.validation === "approved") ? "approved" : "submitted";
  }

  const savedTask = saveTask(task);
  return res.json({
    task: savedTask,
    submission,
    validation,
    payout,
    payoutError,
  });
});

tasksRouter.post("/:id/payout", async (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found." } satisfies ApiErrorBody);
  }

  if (!["approved", "paid"].includes(task.status)) {
    return res.status(409).json({
      error: `Task must be approved before payout. Current status: ${task.status}.`,
    } satisfies ApiErrorBody);
  }

  const input = (req.body ?? {}) as PayoutTaskInput;
  const submission = findSubmission(
    task,
    input.submissionId,
    (item) => item.validation === "approved" && item.payout !== "paid",
  );

  if (!submission) {
    return res.status(404).json({
      error: "Approved submission not found or it has already been paid.",
    } satisfies ApiErrorBody);
  }

  submission.payout = "processing";

  try {
    const payout = await payoutService.payoutSubmission(task, submission);
    applyPayoutResult(task, submission, payout);

    const savedTask = saveTask(task);
    return res.json({
      task: savedTask,
      submission,
      payout,
    });
  } catch (error) {
    submission.payout = "pending";
    task.status = "approved";
    saveTask(task);

    return res.status(502).json({
      error: error instanceof Error ? error.message : "Payout failed.",
    } satisfies ApiErrorBody);
  }
});

function parseCreateTaskInput(body: unknown): CreateTaskInput | { error: string } {
  const input = (body ?? {}) as Partial<CreateTaskInput>;

  if (!isNonEmptyString(input.title)) {
    return { error: "Field \"title\" is required." };
  }

  if (!isNonEmptyString(input.instructions)) {
    return { error: "Field \"instructions\" is required." };
  }

  if (typeof input.reward !== "number" || Number.isNaN(input.reward) || input.reward <= 0) {
    return { error: "Field \"reward\" must be a number greater than zero." };
  }

  if (input.required !== undefined && (!Number.isInteger(input.required) || input.required <= 0)) {
    return { error: "Field \"required\" must be an integer greater than zero." };
  }

  return {
    title: input.title,
    instructions: input.instructions,
    reward: input.reward,
    currency: input.currency ?? "XLM",
    required: input.required ?? 1,
  };
}

function parseSubmitTaskInput(body: unknown): SubmitTaskInput | { error: string } {
  const input = (body ?? {}) as Partial<SubmitTaskInput>;

  if (!isNonEmptyString(input.user)) {
    return { error: "Field \"user\" is required." };
  }

  if (!isNonEmptyString(input.response)) {
    return { error: "Field \"response\" is required." };
  }

  return {
    user: input.user,
    handle: cleanOptionalString(input.handle),
    walletAddress: cleanOptionalString(input.walletAddress),
    response: input.response,
  };
}

function applyPayoutResult(task: Task, submission: Submission, payout: Awaited<ReturnType<PayoutTaskRunner>>): void {
  submission.payout = payout.status === "paid" ? "paid" : "processing";
  submission.payoutId = payout.id;
  submission.txHash = payout.txHash;

  task.payouts.unshift(payout);
  task.status = payout.status === "paid" ? "paid" : "approved";
}

type PayoutTaskRunner = typeof payoutService.payoutSubmission;

function findSubmission(
  task: Task,
  submissionId: string | undefined,
  predicate: (submission: Submission) => boolean,
): Submission | undefined {
  if (submissionId) {
    return task.submissions.find((submission) => submission.id === submissionId && predicate(submission));
  }

  return task.submissions.find((submission) => predicate(submission));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export default tasksRouter;
