"use client";

import { useEffect, useState } from "react";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";
import type { AdminUserListItem, DemoMeeting, ScheduleMeetingPayload } from "@/modules/admin/api/adminApi";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDatetimeLocalValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  if (!iso) {
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(local: string) {
  return new Date(local).toISOString();
}

type ScheduleMeetingModalProps = {
  open: boolean;
  user: Pick<AdminUserListItem, "id" | "name" | "email"> | null;
  meeting?: DemoMeeting | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ScheduleMeetingPayload) => Promise<void>;
};

export default function ScheduleMeetingModal({
  open,
  user,
  meeting,
  submitting,
  onClose,
  onSubmit,
}: ScheduleMeetingModalProps) {
  const isReschedule = Boolean(meeting);
  const [startsAt, setStartsAt] = useState(toDatetimeLocalValue());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setStartsAt(toDatetimeLocalValue(meeting?.startsAt));
    if (meeting?.startsAt && meeting?.endsAt) {
      const mins = Math.max(
        15,
        Math.round((new Date(meeting.endsAt).getTime() - new Date(meeting.startsAt).getTime()) / 60000),
      );
      setDurationMinutes(mins);
    } else {
      setDurationMinutes(30);
    }
    setTitle(meeting?.title ?? "");
    setNotes(meeting?.notes ?? "");
  }, [open, meeting]);

  if (!open || !user) return null;
  const guest = user;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      userId: guest.id,
      startsAt: datetimeLocalToIso(startsAt),
      durationMinutes,
      title: title.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <DashboardModalOverlay open center={false} top onBackdropClick={onClose}>
      <form
        className="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-demo-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="dash-admin-reply__head">
          <div>
            <p id="schedule-demo-title" className="dash-modal__title">
              {isReschedule ? "Reschedule demo" : "Schedule demo"}
            </p>
            <p className="dash-modal__desc">
              {user.name} · {user.email}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <label className="dash-label" style={{ marginTop: "0.75rem" }}>
          Date and time
        </label>
        <input
          type="datetime-local"
          className="dash-input"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
        <p className="dash-muted" style={{ marginTop: 6 }}>
          {startsAt
            ? `Ends ${new Date(new Date(startsAt).getTime() + durationMinutes * 60000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · this device’s timezone`
            : "Uses this device’s timezone"}
        </p>

        <label className="dash-label" style={{ marginTop: "0.75rem" }}>
          Duration
        </label>
        <select
          className="dash-input"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        >
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
        </select>

        <label className="dash-label" style={{ marginTop: "0.75rem" }}>
          Title
        </label>
        <input
          type="text"
          className="dash-input"
          placeholder="ESGSaathi product demo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="dash-label" style={{ marginTop: "0.75rem" }}>
          Agenda / notes
        </label>
        <textarea
          className="dash-input dash-advisor__textarea"
          rows={4}
          placeholder="What you will cover in the demo…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="dash-form-actions" style={{ marginTop: "1rem", justifyContent: "flex-end" }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary btn-sm" disabled={submitting || !startsAt}>
            {submitting ? "Saving…" : isReschedule ? "Update meeting" : "Send invite"}
          </button>
        </div>
      </form>
    </DashboardModalOverlay>
  );
}
