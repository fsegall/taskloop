import type { CreateTaskInput, Task } from "../types";

const tasks = new Map<string, Task>();

function cloneTask(task: Task): Task {
  return JSON.parse(JSON.stringify(task)) as Task;
}

function now(): string {
  return new Date().toISOString();
}

export function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function listTasks(): Task[] {
  return Array.from(tasks.values()).map(cloneTask);
}

export function getTaskById(id: string): Task | undefined {
  const task = tasks.get(id);
  return task ? cloneTask(task) : undefined;
}

export function createTask(input: CreateTaskInput): Task {
  const timestamp = now();
  const task: Task = {
    id: createEntityId("task"),
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    reward: input.reward,
    currency: input.currency ?? "XLM",
    required: input.required ?? 1,
    status: "created",
    createdAt: timestamp,
    updatedAt: timestamp,
    telegramDelivered: 0,
    submissions: [],
    payouts: [],
  };

  tasks.set(task.id, cloneTask(task));
  return cloneTask(task);
}

export function saveTask(task: Task): Task {
  const nextTask: Task = {
    ...task,
    updatedAt: now(),
  };

  tasks.set(nextTask.id, cloneTask(nextTask));
  return cloneTask(nextTask);
}

export function replaceTasks(inputTasks: Task[]): Task[] {
  tasks.clear();

  inputTasks.forEach((task) => {
    tasks.set(task.id, cloneTask(task));
  });

  return listTasks();
}

export function clearStore(): void {
  tasks.clear();
}