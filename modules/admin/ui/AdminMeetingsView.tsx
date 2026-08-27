"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cancelAdminMeeting,
  completeAdminMeeting,
  disconnectGoogleCalendar,
  getGoogleCalendarConnectUrl,
  getGoogleCalendarStatus,
  listAdminMeetings,
  listPendingAdminUsers,
  rescheduleAdminMeeting,
  scheduleAdminMeeting,
  type AdminUserListItem,
  type DemoMeeting,
  type DemoMeetingStatus,
  type GoogleCalendarStatus,
  type MeetingDecision,
} from "@/modules/admin/api/adminApi";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import ScheduleMeetingModal from "@/modules/admin/ui/ScheduleMeetingModal";
import CompleteMeetingModal from "@/modules/admin/ui/CompleteMeetingModal";
import AdminMeetingCard from "@/modules/admin/ui/AdminMeetingCard";

const FILTERS: { id: DemoMeetingStatus; label: string }[] = [
  { id: "SCHEDULED", label: "Upcoming" },
  { id: "COMPLETED", label: "Done" },
];

export default function AdminMeetingsView() {
  const toast = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<DemoMeetingStatus>("SCHEDULED");
  const [meetings, setMeetings] = useState<DemoMeeting[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendar, setCalendar] = useState<GoogleCalendarStatus | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUserListItem[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleUser, setScheduleUser] = useState<AdminUserListItem | null>(null);
  const [rescheduleMeeting, setRescheduleMeeting] = useState<DemoMeeting | null>(null);
  const [completeMeeting, setCompleteMeeting] = useState<DemoMeeting | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useToastOnValue(error, "error");

  const loadCalendar = useCallback(async () => {
    try {
      setCalendar(await getGoogleCalendarStatus());
    } catch {
      setCalendar({ configured: false, connected: false, googleEmail: null });
    }
  }, []);

  const load = useCallback(
    async (targetPage: number, options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      setError("");
      try {
        const result = await listAdminMeetings(filter, targetPage);
        const list = result.content ?? [];
        setMeetings(
          filter === "SCHEDULED"
            ? [...list].sort(
                (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
              )
            : list,
        );
        setPage(result.number ?? targetPage);
        setTotalPages(Math.max(result.totalPages ?? 1, 1));
      } catch (ex: unknown) {
        setError(ex instanceof Error ? ex.message : "Failed to load meetings");
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );

  const loadPending = useCallback(async () => {
    try {
      const [pending, scheduled] = await Promise.all([
        listPendingAdminUsers(0, 100),
        listAdminMeetings("SCHEDULED", 0, 100),
      ]);
      const booked = new Set((scheduled.content ?? []).map((m) => m.userId));
      setPendingUsers((pending.content ?? []).filter((u) => !booked.has(u.id)));
    } catch {
      setPendingUsers([]);
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
    void loadPending();
  }, [loadCalendar, loadPending]);

  useEffect(() => {
    void load(0);
  }, [load]);

  useEffect(() => {
    const flag = searchParams.get("google");
    if (flag === "connected") {
      toast.show("Google Calendar connected", "success");
      void loadCalendar();
    } else if (flag === "error") {
      toast.show("Google Calendar could not be connected. Try again.", "error");
    }
  }, [searchParams, toast, loadCalendar]);

  const guests = pendingUsers;

  async function connectCalendar() {
    try {
      const { url } = await getGoogleCalendarConnectUrl();
      window.location.assign(url);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Could not start Google Calendar connect");
    }
  }

  async function handleDisconnect() {
    const ok = await confirm({
      title: "Disconnect Google Calendar?",
      description: "New demos will still be emailed, without a Meet link.",
      confirmLabel: "Disconnect",
      destructive: true,
    });
    if (!ok) return;
    try {
      await disconnectGoogleCalendar();
      toast.show("Google Calendar disconnected", "success");
      await loadCalendar();
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to disconnect");
    }
  }

  function closeSchedule() {
    setScheduleOpen(false);
    setScheduleUser(null);
    setRescheduleMeeting(null);
  }

  async function handleSchedule(payload: Parameters<typeof scheduleAdminMeeting>[0]) {
    setSubmitting(true);
    try {
      if (rescheduleMeeting) {
        await rescheduleAdminMeeting(rescheduleMeeting.id, payload);
        toast.show("Time updated", "success");
      } else {
        await scheduleAdminMeeting(payload);
        toast.show("Invite sent", "success");
      }
      closeSchedule();
      await Promise.all([load(page, { silent: true }), loadPending()]);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(meeting: DemoMeeting) {
    const ok = await confirm({
      title: "Cancel this demo?",
      description: `${meeting.userName ?? meeting.userEmail} will be emailed.`,
      confirmLabel: "Cancel meeting",
      destructive: true,
    });
    if (!ok) return;
    setActingId(meeting.id);
    try {
      await cancelAdminMeeting(meeting.id);
      toast.show("Meeting cancelled", "success");
      await Promise.all([load(page, { silent: true }), loadPending()]);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to cancel");
    } finally {
      setActingId(null);
    }
  }

  async function handleComplete(payload: { conclusion: string; decision: MeetingDecision }) {
    if (!completeMeeting) return;
    setSubmitting(true);
    try {
      await completeAdminMeeting(completeMeeting.id, payload);
      toast.show(
        payload.decision === "APPROVE"
          ? "Approved"
          : payload.decision === "REJECT"
            ? "Rejected"
            : "Saved",
        "success",
      );
      setCompleteMeeting(null);
      await Promise.all([load(page, { silent: true }), loadPending()]);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to record conclusion");
    } finally {
      setSubmitting(false);
    }
  }

  function openReschedule(meeting: DemoMeeting) {
    setRescheduleMeeting(meeting);
    setScheduleUser({
      id: meeting.userId,
      name: meeting.userName ?? "",
      email: meeting.userEmail ?? "",
    } as AdminUserListItem);
    setScheduleOpen(true);
  }

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card">
        <div className="dash-meeting-toolbar">
          <div>
            <p className="dash-welcome-card__eyebrow">Demos</p>
            <p className="dash-welcome-card__title">Meetings</p>
            <p className="dash-muted" style={{ marginTop: 6 }}>
              Set a subject, pick a time, send the invite.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pendingUsers.length === 0}
            onClick={() => {
              setScheduleUser(null);
              setRescheduleMeeting(null);
              setScheduleOpen(true);
            }}
          >
            Schedule demo
          </button>
        </div>
      </div>

      <div className="card card--elevated dash-meeting-cal">
        <p className="dash-muted" style={{ margin: 0 }}>
          {calendar?.connected
            ? `Calendar: ${calendar.googleEmail}`
            : calendar?.configured
              ? "Connect Calendar to add a Meet link to invites."
              : "Invites are emailed. Connect Calendar when you want Meet links."}
        </p>
        {calendar?.connected ? (
          <button type="button" className="btn-ghost btn-sm" onClick={() => void handleDisconnect()}>
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => void connectCalendar()}
            disabled={calendar != null && !calendar.configured}
          >
            Connect Calendar
          </button>
        )}
      </div>

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        <div className="dash-panel-head">
          <div className="dash-meeting-filters" role="tablist" aria-label="Meeting status">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`dash-meeting-filters__btn${filter === item.id ? " is-active" : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading && meetings.length === 0 ? (
          <p className="dash-muted" style={{ padding: "1.5rem", textAlign: "center" }}>
            Loading…
          </p>
        ) : meetings.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 200 }}>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              {filter === "SCHEDULED" ? "No upcoming demos" : "No completed demos"}
            </p>
            {filter === "SCHEDULED" && pendingUsers.length > 0 ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => {
                  setScheduleUser(null);
                  setScheduleOpen(true);
                }}
              >
                Schedule demo
              </button>
            ) : null}
          </div>
        ) : (
          <div className="dash-meeting-list">
            {meetings.map((m) => (
              <AdminMeetingCard
                key={m.id}
                meeting={m}
                busy={actingId === m.id}
                onJoin={(meeting) => window.open(meeting.meetLink ?? "", "_blank", "noopener,noreferrer")}
                onReschedule={openReschedule}
                onConclude={setCompleteMeeting}
                onCancel={(meeting) => void handleCancel(meeting)}
              />
            ))}
          </div>
        )}

        {!loading && meetings.length > 0 && totalPages > 1 && (
          <div
            className="dash-form-actions"
            style={{
              justifyContent: "flex-end",
              padding: "0.625rem 0.75rem",
              borderTop: "0.5px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={page === 0 || loading}
              onClick={() => void load(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => void load(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ScheduleMeetingModal
        open={scheduleOpen}
        user={scheduleUser}
        guests={guests}
        meeting={rescheduleMeeting}
        submitting={submitting}
        onClose={closeSchedule}
        onSubmit={handleSchedule}
      />
      <CompleteMeetingModal
        meeting={completeMeeting}
        submitting={submitting}
        onClose={() => setCompleteMeeting(null)}
        onSubmit={handleComplete}
      />
    </div>
  );
}
