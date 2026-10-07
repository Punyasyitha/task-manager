import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import * as store from "./store";

const app = express();
app.use(cors());
app.use(express.json());

function requireActor(value: unknown): store.Actor {
  if (!store.isActor(value))
    throw new store.DomainError(400, `actor must be one of: ${store.ACTORS.join(", ")}`);
  return value;
}

app.get("/meta", (_req, res) => {
  res.json({ statuses: store.STATUSES, actors: store.ACTORS });
});

app.get("/tasks", (_req, res) => {
  res.json(store.listTasks());
});

app.post("/tasks", (req, res) => {
  const { title, actor } = req.body ?? {};
  if (typeof title !== "string" || !title.trim())
    throw new store.DomainError(400, "title is required");
  const task = store.createTask(title, requireActor(actor));
  res.status(201).json(task);
});

app.put("/tasks/:id/status", (req, res) => {
  const { status, actor } = req.body ?? {};
  if (!store.isStatus(status))
    throw new store.DomainError(400, `status must be one of: ${store.STATUSES.join(", ")}`);
  const result = store.updateStatus(req.params.id, status, requireActor(actor));
  res.json(result);
});

app.delete("/tasks/:id", (req, res) => {
  store.deleteTask(req.params.id, requireActor(req.body?.actor));
  res.status(204).end();
});

app.get("/tasks/:id/audit-logs", (req, res) => {
  res.json(store.getLogs(req.params.id));
});

// Penangkap error: harus paling bawah dan punya 4 parameter
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof store.DomainError) {
    return res.status(err.code).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const port = 4000;
app.listen(port, () => console.log(`API on http://localhost:${port}`));