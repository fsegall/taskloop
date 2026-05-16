import { useSyncExternalStore } from "react";
import type { Submission, Task } from "./mock-tasks";

type TasksState = {
  tasks: Task[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
};

export type TaskInput = {
  title: string;
  instructions: string;
  reward: number;
  currency: Task["currency"];
  required: number;
};

export type SubmissionInput = {
  user: string;
  handle?: string;
  walletAddress?: string;
  response: string;
};

type ApiSubmission = {
  id: string;
  user: string;
  handle?: string;
  response: string;
  submittedAt: string;
  validation: Submission["validation"];
  payout: Submission["payout"];
  txHash?: string;
};

type ApiTask = {
  id: string;
  title: string;
  instructions: string;
  reward: number;
  currency: Task["currency"];
  required: number;
  status: Task["status"];
  createdAt: string;
  telegramDelivered: number;
  submissions: ApiSubmission[];
};

const LOCAL_API_BASE_URL = "http://localhost:3000";
const isServerRuntime = typeof window === "undefined";

function getApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (!isServerRuntime) {
    const { hostname } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocalHost) {
      throw new Error(
        "VITE_API_BASE_URL is not configured for this environment. In Lovable, set it to the public TaskLoop API URL.",
      );
    }
  }

  return LOCAL_API_BASE_URL;
}

let state: TasksState = {
  tasks: [],
  isLoading: false,
  hasLoaded: false,
  error: null,
};
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

function emit(nextState?: Partial<TasksState>) {
  state = {
    ...state,
    ...nextState,
    tasks: nextState?.tasks ? [...nextState.tasks] : [...state.tasks],
  };
  listeners.forEach((listener) => listener());
}

function normalizeSubmission(submission: ApiSubmission): Submission {
  return {
    id: submission.id,
    user: submission.user,
    handle: submission.handle ?? "",
    response: submission.response,
    submittedAt: submission.submittedAt,
    validation: submission.validation,
    payout: submission.payout,
    txHash: submission.txHash,
  };
}

function normalizeTask(task: ApiTask): Task {
  return {
    id: task.id,
    title: task.title,
    instructions: task.instructions,
    reward: task.reward,
    currency: task.currency,
    required: task.required,
    status: task.status,
    createdAt: task.createdAt,
    telegramDelivered: task.telegramDelivered,
    submissions: task.submissions.map(normalizeSubmission),
  };
}

function upsertTask(task: Task): Task {
  const index = state.tasks.findIndex((item) => item.id === task.id);
  const nextTasks = [...state.tasks];

  if (index === -1) {
    nextTasks.unshift(task);
  } else {
    nextTasks[index] = task;
  }

  emit({ tasks: nextTasks, hasLoaded: true, error: null });
  return task;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const rawBody = await response.text();
  let data: T | { error?: string } | undefined;

  if (rawBody.length > 0) {
    try {
      data = JSON.parse(rawBody) as T | { error?: string };
    } catch {
      const preview = rawBody.slice(0, 120).replace(/\s+/g, " ").trim();
      throw new Error(`TaskLoop API returned a non-JSON response. Check VITE_API_BASE_URL. Response preview: ${preview}`);
    }
  }

  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? data.error : undefined;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export function useTasks() {
  return useSyncExternalStore(subscribe, () => getSnapshot().tasks, () => getSnapshot().tasks);
}

export function useTasksMeta() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getTask(id: string) {
  return state.tasks.find((task) => task.id === id);
}

export async function loadTasks(force = false): Promise<Task[]> {
  if (isServerRuntime) {
    return state.tasks;
  }

  if (state.hasLoaded && !force) {
    return state.tasks;
  }

  emit({ isLoading: true, error: null });

  try {
    const data = await requestJson<{ tasks: ApiTask[] }>("/tasks");
    const tasks = data.tasks.map(normalizeTask);
    emit({ tasks, isLoading: false, hasLoaded: true, error: null });
    return tasks;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tasks.";
    emit({ isLoading: false, error: message, hasLoaded: true });
    throw error;
  }
}

export async function loadTask(taskId: string): Promise<Task | undefined> {
  if (isServerRuntime) {
    return getTask(taskId);
  }

  emit({ isLoading: true, error: null });

  try {
    const data = await requestJson<{ task: ApiTask }>(`/tasks/${taskId}`);
    const task = normalizeTask(data.task);
    emit({ isLoading: false, hasLoaded: true, error: null });
    return upsertTask(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load task.";
    emit({ isLoading: false, error: message, hasLoaded: true });
    return undefined;
  }
}

export async function createTask(input: TaskInput): Promise<string> {
  const data = await requestJson<{ task: ApiTask }>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const task = upsertTask(normalizeTask(data.task));
  return task.id;
}

export async function sendTask(taskId: string): Promise<Task> {
  const data = await requestJson<{ task: ApiTask }>(`/tasks/${taskId}/send`, {
    method: "POST",
  });

  return upsertTask(normalizeTask(data.task));
}

export async function submitTask(taskId: string, input: SubmissionInput): Promise<Task> {
  const data = await requestJson<{ task: ApiTask }>(`/tasks/${taskId}/submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return upsertTask(normalizeTask(data.task));
}

export async function approveTask(taskId: string, submissionId?: string): Promise<Task> {
  const data = await requestJson<{ task: ApiTask }>(`/tasks/${taskId}/approve`, {
    method: "POST",
    body: JSON.stringify(submissionId ? { submissionId } : {}),
  });

  return upsertTask(normalizeTask(data.task));
}

export async function payoutTask(taskId: string, submissionId?: string): Promise<Task> {
  const data = await requestJson<{ task: ApiTask }>(`/tasks/${taskId}/payout`, {
    method: "POST",
    body: JSON.stringify(submissionId ? { submissionId } : {}),
  });

  return upsertTask(normalizeTask(data.task));
}

export async function seedDemoTasks(): Promise<Task[]> {
  const data = await requestJson<{ tasks: ApiTask[] }>("/dev/seed", {
    method: "POST",
  });

  const tasks = data.tasks.map(normalizeTask);
  emit({ tasks, hasLoaded: true, isLoading: false, error: null });
  return tasks;
}

export async function resetDemoTasks(): Promise<void> {
  await requestJson<{ message: string }>("/dev/reset", {
    method: "POST",
  });

  emit({ tasks: [], hasLoaded: true, isLoading: false, error: null });
}
