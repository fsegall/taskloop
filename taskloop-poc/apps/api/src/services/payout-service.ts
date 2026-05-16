import { createEntityId } from "../store/memory";
import type { Payout, Submission, Task } from "../types";
import { stellarClient } from "./stellar";

export interface PayoutService {
  payoutSubmission(task: Task, submission: Submission): Promise<Payout>;
}

class TaskLoopPayoutService implements PayoutService {
  async payoutSubmission(task: Task, submission: Submission): Promise<Payout> {
    const execution = await stellarClient.sendPayment({
      amount: task.reward,
      currency: task.currency,
      destination: submission.walletAddress,
      memo: `TaskLoop payout for ${task.id}/${submission.id}`,
    });

    return {
      id: createEntityId("payout"),
      taskId: task.id,
      submissionId: submission.id,
      amount: task.reward,
      currency: task.currency,
      provider: execution.provider,
      status: execution.status,
      createdAt: new Date().toISOString(),
      processedAt: execution.processedAt,
      txHash: execution.txHash,
    };
  }
}

export const payoutService: PayoutService = new TaskLoopPayoutService();
