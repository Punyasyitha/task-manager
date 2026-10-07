import type { AuditLog, Meta, Task } from "./types";

const API = "http://localhost:4000";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export const api = {
  meta: () => call<Meta>("/meta"),
  list: () => call<Task[]>("/tasks"),
  create: (title: string, actor: string) =>
    call<Task>("/tasks", { method: "POST", body: JSON.stringify({ title, actor }) }),
  setStatus: (id: string, status: string, actor: string) =>
    call<{ task: Task; changed: boolean }>(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, actor }),
    }),
  remove: (id: string, actor: string) =>
    call<void>(`/tasks/${id}`, { method: "DELETE", body: JSON.stringify({ actor }) }),
  logs: (id: string) => call<AuditLog[]>(`/tasks/${id}/audit-logs`),
};