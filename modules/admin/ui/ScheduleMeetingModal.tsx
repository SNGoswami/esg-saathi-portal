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

type Guest = Pick<AdminUserListItem, "id" | "name" | "email">;

type ScheduleMeetingModalProps = {
  open: boolean;
  user: Guest | null;
  guests?: Guest[];
  meeting?: DemoMeeting | null;
  presetStartsAt?: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ScheduleMeetingPayload) => Promise<void>;
};

const DURATIONS = [30, 45, 60];
const DEFAULT_SUBJECT = "ESGSaathi product demo";
const SUBJECT_PRESETS = [
  { label: "Product demo", base: "ESGSaathi product demo" },
  { label: "Onboarding", base: "ESGSaathi onboarding" },
  { label: "BRSR walkthrough", base: "BRSR walkthrough" },
  { label: "Follow-up", base: "Account follow-up" },
];

function firstName(guest: Guest | null) {
  return guest?.name?.trim().split(/\s+/)[0] ?? "";
}

function subjectFor(base: string, guest: Guest | null) {
  const stem = base.replace(/\s+[—–-]\s+\S+$/, "").trim() || DEFAULT_SUBJECT;
  const first = firstName(guest);
  return first ? `${stem} — ${first}` : stem;
}

export default function ScheduleMeetingModal({
  open,
  user,
  guests = [],
  meeting,
  presetStartsAt,
  submitting,
  onClose,
  onSubmit,
}: ScheduleMeetingModalProps) {
  const isReschedule = Boolean(meeting);
  const [guestId, setGuestId] = useState("");
  const [title, setTitle] = useState(DEFAULT_SUBJECT);
  const [titleDirty, setTitleDirty] = useState(false);
  const [startsAt, setStartsAt] = useState(toDatetimeLocalValue());
  const [durationMinutes, setDurationMinutes] = useState(30);

  const selected = user ?? guests.find((g) => g.id === guestId) ?? null;
  const needsPicker = !isReschedule && !user;

  useEffect(() => {
    if (!open) return;
    setGuestId(user?.id ?? "");
    setStartsAt(toDatetimeLocalValue(meeting?.startsAt ?? presetStartsAt));
    setTitle(meeting?.title?.trim() || subjectFor(DEFAULT_SUBJECT, user));
    setTitleDirty(Boolean(meeting?.title));
    if (meeting?.startsAt && meeting?.endsAt) {
      const mins = Math.max(
        15,
        Math.round((new Date(meeting.endsAt).getTime() - new Date(meeting.startsAt).getTime()) / 60000),
      );
      setDurationMinutes(mins);
    } else {
      setDurationMinutes(30);
    }
  }, [open, user, meeting, presetStartsAt]);

  useEffect(() => {
    if (!open || titleDirty || meeting) return;
    setTitle(subjectFor(DEFAULT_SUBJECT, selected));
  }, [open, selected, titleDirty, meeting]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !title.trim()) return;
    await onSubmit({
      userId: selected.id,
      title: title.trim(),
      startsAt: datetimeLocalToIso(startsAt),
      durationMinutes,
    });
  }

  return (
    <DashboardModalOverlay open center={false} top onBackdropClick={onClose}>
      <form
        className="dash-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-demo-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="dash-admin-reply__head">
          <div>
            <p id="schedule-demo-title" className="dash-modal__title">
              {isReschedule ? "Change meeting" : "Schedule demo"}
            </p>
            <p className="dash-modal__desc">
              {isReschedule || user
                ? `${user?.name ?? selected?.name ?? ""} · ${user?.email ?? selected?.email ?? ""}`
                : "Guest, subject, and time. We email the invite."}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {needsPicker && guests.length === 0 ? (
          <>
            <p className="dash-muted" style={{ marginTop: "0.75rem" }}>
              Every pending user already has a demo. Change an existing one instead.
            </p>
            <div className="dash-form-actions" style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {needsPicker ? (
              <>
                <label className="dash-label" style={{ marginTop: "0.75rem" }}>
                  Guest
                </label>
                <select
                  className="dash-input"
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  required
                >
                  <option value="">Select a pending user…</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.email}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="dash-label" style={{ marginTop: "0.75rem" }} htmlFor="meeting-subject">
              Subject
            </label>
            <input
              id="meeting-subject"
              type="text"
              className="dash-input"
              value={title}
              maxLength={120}
              required
              placeholder="What is this meeting about?"
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleDirty(true);
              }}
            />
            <div className="dash-meeting-filters" style={{ marginTop: "0.4rem" }} role="group" aria-label="Subject suggestions">
              {SUBJECT_PRESETS.map((preset) => {
                const value = subjectFor(preset.base, selected);
                const active = title.trim() === value;
                return (
                  <button
                    key={preset.base}
                    type="button"
                    className={`dash-meeting-filters__btn${active ? " is-active" : ""}`}
                    onClick={() => {
                      setTitle(value);
                      setTitleDirty(true);
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <label className="dash-label" style={{ marginTop: "0.75rem" }}>
              When
            </label>
            <input
              type="datetime-local"
              className="dash-input"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />

            <p className="dash-label" style={{ marginTop: "0.75rem" }}>
              Length
            </p>
            <div className="dash-meeting-filters" role="group" aria-label="Duration">
              {DURATIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`dash-meeting-filters__btn${durationMinutes === mins ? " is-active" : ""}`}
                  onClick={() => setDurationMinutes(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div className="dash-form-actions" style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={submitting || !startsAt || !selected || !title.trim()}
              >
                {submitting ? "Sending…" : isReschedule ? "Save" : "Send invite"}
              </button>
            </div>
          </>
        )}
      </form>
    </DashboardModalOverlay>
  );
}
