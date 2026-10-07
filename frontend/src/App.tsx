import { type FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import type { AuditLog, Meta, Task } from "./types";
import "./App.css";

const label = (s: string) => s.replace("_", " ");

function describe(l: AuditLog): string {
  if (l.action === "created") return `${l.actor} created "${l.taskTitle}" as ${label(l.to!)}`;
  if (l.action === "deleted") return `${l.actor} deleted "${l.taskTitle}"`;
  return `${l.actor} changed "${l.taskTitle}" status from ${label(l.from!)} to ${label(l.to!)}`;
}

function History({ task }: { task: Task }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.logs(task.id).then(setLogs);
  }, [task.id, task.updatedAt]);

  return (
    <ol className="history">
      {logs.map((l) => (
        <li key={l.id} className={l.action}>
          <time>{new Date(l.at).toLocaleString()}</time>
          {describe(l)}
        </li>
      ))}
    </ol>
  );
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actor, setActor] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = () => api.list().then(setTasks);

  useEffect(() => {
    api.meta().then((m) => {
      setMeta(m);
      setActor(m.actors[0]);
    });
    reload();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      setError("");
      await api.create(title, actor);
      setTitle("");
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function advance(t: Task) {
    const next = meta!.statuses[meta!.statuses.indexOf(t.status) + 1];
    try {
      setError("");
      await api.setStatus(t.id, next, actor);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(t: Task) {
    try {
      setError("");
      await api.remove(t.id, actor);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!meta) return <p className="wrap">Loading…</p>;

  return (
    <main className="wrap">
      <div className="top">
        <h1>Mini Task Manager</h1>
        <label className="actor">
          Acting as
          <select value={actor} onChange={(e) => setActor(e.target.value)}>
            {meta.actors.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>

      <form onSubmit={add} className="add">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task title" />
        <button type="submit" className="btn primary">Add task</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {tasks.length === 0 && <p className="empty">No tasks yet. Add one above.</p>}

      <ul className="tasks">
        {tasks.map((t) => {
          const idx = meta.statuses.indexOf(t.status);
          const isDone = t.status === "done";
          return (
            <li key={t.id} className={`task ${t.status}`}>
              <div className="row">
                <span className="title">{t.title}</span>
                <span className="badge">{label(t.status)}</span>
              </div>

              <div className="steps" aria-hidden="true">
                {meta.statuses.map((s, i) => (
                  <span key={s} className={i <= idx ? "on" : ""} />
                ))}
              </div>

              <div className="actions">
                <button className="btn primary" disabled={isDone} onClick={() => advance(t)}>
                  {isDone ? "Completed" : `Move to ${label(meta.statuses[idx + 1])}`}
                </button>
                <button className="btn" onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                  {openId === t.id ? "Hide history" : "History"}
                </button>
                <button className="btn danger" onClick={() => remove(t)}>Delete</button>
              </div>

              {openId === t.id && <History task={t} />}
            </li>
          );
        })}
      </ul>
    </main>
  );
}