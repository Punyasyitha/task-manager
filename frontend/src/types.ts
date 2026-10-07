export type Status = "to_do" | "pending" | "in_progress" | "done";
export interface Task { id: string; title: string; status: Status; createdAt: string; updatedAt: string }
export interface Meta { statuses: Status[]; actors: string[] }
export interface AuditLog {
  id: string; seq: number; taskId: string; taskTitle: string; actor: string;
  action: "created" | "status_changed" | "deleted";
  from: Status | null; to: Status | null; at: string;
}