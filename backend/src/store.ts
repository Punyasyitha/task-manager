import { randomUUID } from "crypto";

export const STATUSES = ["to_do", "pending", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];
export const ACTORS = ["john.doe", "bambang.udin", "doni.setyawan", "budi.santoso"] as const;
export type Actor = (typeof ACTORS)[number];

export interface Task { id: string; title: string; status: Status; createdAt: string; updatedAt: string }
export interface AuditLog {
  readonly id: string; readonly seq: number; readonly taskId: string; readonly taskTitle: string;
  readonly actor: Actor; readonly action: "created" | "status_changed" | "deleted";
  readonly from: Status | null; readonly to: Status | null; readonly at: string;
}

export class DomainError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export function nextStatus(current: Status): Status | null {
  const posisi = STATUSES.indexOf(current);
  const berikutnya = STATUSES[posisi + 1];
  return berikutnya ?? null;
}

const tasks = new Map<string, Task>();
const logs: AuditLog[] = [];
let seq = 0;

function appendLog(e: Omit<AuditLog, "id" | "seq" | "at">): void {
  const log: AuditLog = {
    ...e,
    id: randomUUID(),
    seq: ++seq,
    at: new Date().toISOString(),
  };
  logs.push(Object.freeze(log));
}

export const listTasks = (): Task[] => [...tasks.values()];

export function createTask(title: string, actor: Actor): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: randomUUID(),
    title: title.trim(),
    status: "to_do",
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(task.id, task);
  appendLog({
    taskId: task.id,
    taskTitle: task.title,
    actor,
    action: "created",
    from: null,
    to: task.status,
  });
  return task;
}

export function updateStatus(id: string, next: Status, actor: Actor) {
  const task = tasks.get(id);
  if (!task) throw new DomainError(404, "task not found");

  if (task.status === next) return { task, changed: false };

  const diizinkan = nextStatus(task.status);
  if (next !== diizinkan) {
    throw new DomainError(
      422,
      `invalid transition ${task.status} -> ${next}; allowed next status: ${diizinkan ?? "none"}`
    );
  }

  const updated: Task = { ...task, status: next, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  appendLog({
    taskId: id,
    taskTitle: task.title,
    actor,
    action: "status_changed",
    from: task.status,
    to: next,
  });

  return { task: updated, changed: true };
}

export function deleteTask(id: string, actor: Actor): void {
  const task = tasks.get(id);
  if (!task) throw new DomainError(404, "task not found");

  tasks.delete(id);
  appendLog({
    taskId: id,
    taskTitle: task.title,
    actor,
    action: "deleted",
    from: task.status,
    to: null,
  });
}

export const getLogs = (taskId: string): AuditLog[] =>
  logs
    .filter((l) => l.taskId === taskId)
    .sort((a, b) => a.seq - b.seq)
    .map((l) => ({ ...l }));

export const isActor = (a: unknown): a is Actor => ACTORS.includes(a as Actor);
export const isStatus = (s: unknown): s is Status => STATUSES.includes(s as Status);