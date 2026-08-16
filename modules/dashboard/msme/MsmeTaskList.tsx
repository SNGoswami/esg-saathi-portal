"use client";

import { useMemo, useState, useCallback } from "react";
import type { MsmePriority } from "@/modules/dashboard/msme/msmeAnalytics";

type Task = {
  id: string;
  title: string;
  pillar: "e" | "s" | "g";
  due: string | null;
  overdue: boolean;
  done: boolean;
};

const PILL: Record<"e" | "s" | "g", { className: string; label: string }> = {
  e: { className: "dash-task-pill dash-task-pill--e", label: "Environmental" },
  s: { className: "dash-task-pill dash-task-pill--s", label: "Social" },
  g: { className: "dash-task-pill dash-task-pill--g", label: "Governance" },
};

function pillarFromMeta(meta: string): "e" | "s" | "g" {
  if (meta.toLowerCase().includes("social")) return "s";
  if (meta.toLowerCase().includes("governance")) return "g";
  return "e";
}

function prioritiesToTasks(priorities: MsmePriority[]): Task[] {
  return priorities.map((item) => ({
    id: item.id,
    title: item.title,
    pillar: pillarFromMeta(item.meta),
    due: item.severity === "high" ? "Priority" : null,
    overdue: item.severity === "high",
    done: false,
  }));
}

export default function MsmeTaskList({
  priorities,
  loading,
}: {
  priorities: MsmePriority[];
  loading: boolean;
}) {
  const initial = useMemo(() => prioritiesToTasks(priorities), [priorities]);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());

  const tasks = useMemo(
    () => initial.map((task) => ({ ...task, done: doneIds.has(task.id) })),
    [initial, doneIds],
  );

  const toggle = useCallback((id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pending = tasks.filter((t) => !t.done).length;

  return (
    <section className="card overview-panel">
      <div className="overview-panel__head">
        <h2 className="overview-section__title">Pending actions</h2>
        <span className="overview-list__badge">{pending} left</span>
      </div>

      {loading && <p className="dash-muted overview-panel__empty">Loading actions…</p>}
      {!loading && tasks.length === 0 && (
        <p className="dash-muted overview-panel__empty">No pending actions right now.</p>
      )}
      {!loading && tasks.length > 0 && (
        <ul className="msme-task-list">
          {tasks.map((task) => {
            const pill = PILL[task.pillar];
            return (
              <li key={task.id} className="msme-task-list__item">
                <button
                  type="button"
                  className={`msme-task-list__check${task.done ? " msme-task-list__check--done" : ""}`}
                  onClick={() => toggle(task.id)}
                  aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                />
                <div className="msme-task-list__main">
                  <p className={`msme-task-list__title${task.done ? " msme-task-list__title--done" : ""}`}>
                    {task.title}
                  </p>
                  <div className="msme-task-list__meta">
                    <span className={pill.className}>{pill.label}</span>
                    {task.overdue && <span className="msme-task-list__overdue">Priority</span>}
                    {task.due && !task.overdue && (
                      <span className="overview-list__meta">{task.due}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
