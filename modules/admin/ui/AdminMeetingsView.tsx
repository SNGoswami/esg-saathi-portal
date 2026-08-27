"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ADMIN_ROLE_LABELS,
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
  type AdminUserRole,
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
import { isMeetingLive, isMeetingToday } from "@/modules/admin/ui/meetingHelpers";

const FILTERS: { id: DemoMeetingStatus | "ALL" | "TODAY"; label: string }[] = [
  { id: "SCHEDULED", label: "Upcoming" },
  { id: "TODAY", label: "Today" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "ALL", label: "All" },
];

export default function AdminMeetingsView() {
  const toast = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("SCHEDULED");
  const [meetings, setMeetings] = useState<DemoMeeting[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [calendar, setCalendar] = useState<GoogleCalendarStatus | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUserListItem[]>([]);
  const [upcoming, setUpcoming] = useState<DemoMeeting[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [scheduleUser, setScheduleUser] = useState<AdminUserListItem | null>(null);
  const [rescheduleMeeting, setRescheduleMeeting] = useState<DemoMeeting | null>(null);
  const [completeMeeting, setCompleteMeeting] = useState<DemoMeeting | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useToastOnValue(error, "error");

  const apiStatus: DemoMeetingStatus | "ALL" = filter === "TODAY" ? "SCHEDULED" : filter;

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
        const result = await listAdminMeetings(apiStatus, targetPage);
        setMeetings(result.content ?? []);
        setPage(result.number ?? targetPage);
        setTotalPages(Math.max(result.totalPages ?? 1, 1));
        setTotalElements(result.totalElements ?? 0);
      } catch (ex: unknown) {
        setError(ex instanceof Error ? ex.message : "Failed to load meetings");
      } finally {
        setLoading(false);
      }
    },
    [apiStatus],
  );

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    void load(0);
  }, [load]);

  const loadRoster = useCallback(async () => {
    try {
      const [pending, scheduled] = await Promise.all([
        listPendingAdminUsers(0, 100),
        listAdminMeetings("SCHEDULED", 0, 100),
      ]);
      setPendingUsers(pending.content ?? []);
      setUpcoming(
        [...(scheduled.content ?? [])].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      );
    } catch {
      setPendingUsers([]);
      setUpcoming([]);
    }
  }, []);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    const flag = searchParams.get("google");
    if (flag === "connected") {
      toast.show("Google Calendar connected", "success");
      void loadCalendar();
    } else if (flag === "error") {
      toast.show("Google Calendar could not be connected. Try again.", "error");
    }
  }, [searchParams, toast, loadCalendar]);

  const pendingWithoutDemo = useMemo(() => {
    const booked = new Set(upcoming.map((m) => m.userId));
    return pendingUsers.filter((u) => !booked.has(u.id));
  }, [pendingUsers, upcoming]);

  const visibleMeetings = useMemo(() => {
    let list = meetings;
    if (filter === "TODAY") list = list.filter((m) => isMeetingToday(m));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const hay = [m.userName, m.userEmail, m.title, m.notes].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (filter === "SCHEDULED" || filter === "TODAY") {
      return [...list].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return list;
  }, [meetings, filter, search]);

  const todayCount = useMemo(() => upcoming.filter((m) => isMeetingToday(m)).length, [upcoming]);
  const liveMeeting = upcoming.find((m) => isMeetingLive(m)) ?? null;

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
      description: "New demos will still be saved and emailed, but they will not appear on your Google Calendar.",
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

  async function handleSchedule(payload: Parameters<typeof scheduleAdminMeeting>[0]) {
    setSubmitting(true);
    try {
      if (rescheduleMeeting) {
        await rescheduleAdminMeeting(rescheduleMeeting.id, payload);
        toast.show("Meeting updated", "success");
      } else {
        await scheduleAdminMeeting(payload);
        toast.show("Demo invite sent", "success");
      }
      setScheduleUser(null);
      setRescheduleMeeting(null);
      await Promise.all([load(page, { silent: true }), loadRoster()]);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(meeting: DemoMeeting) {
    const ok = await confirm({
      title: "Cancel this demo?",
      description: `${meeting.userName ?? meeting.userEmail} will be emailed that the meeting is cancelled.`,
      confirmLabel: "Cancel meeting",
      destructive: true,
    });
    if (!ok) return;
    setActingId(meeting.id);
    try {
      await cancelAdminMeeting(meeting.id);
      toast.show("Meeting cancelled", "success");
      await Promise.all([load(page, { silent: true }), loadRoster()]);
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
      const label =
        payload.decision === "APPROVE"
          ? "Demo recorded and account approved"
          : payload.decision === "REJECT"
            ? "Demo recorded and account rejected"
            : "Demo conclusion saved";
      toast.show(label, "success");
      setCompleteMeeting(null);
      await Promise.all([load(page, { silent: true }), loadRoster()]);
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
  }

  async function copyMeet(meeting: DemoMeeting) {
    if (!meeting.meetLink) return;
    try {
      await navigator.clipboard.writeText(meeting.meetLink);
      toast.show("Meet link copied", "success");
    } catch {
      toast.show("Could not copy Meet link", "error");
    }
  }

  const calendarState = !calendar
    ? "checking"
    : calendar.connected
      ? "connected"
      : calendar.configured
        ? "ready"
        : "missing";

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card">
        <p className="dash-welcome-card__eyebrow">Demos</p>
        <p className="dash-welcome-card__title">Meeting control</p>
        <p className="dash-muted" style={{ marginTop: 6 }}>
          Run product demos from here: join the call, reschedule, then approve or reject at conclusion.
        </p>
      </div>

      <div className="dash-grid-stats">
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Today</span>
          <p className="dash-stat-value" style={{ color: "var(--brand-700)", marginTop: 8 }}>
            {todayCount}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            {liveMeeting ? "One is live now" : "scheduled demos"}
          </p>
        </div>
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Upcoming</span>
          <p className="dash-stat-value" style={{ color: "var(--brand-600)", marginTop: 8 }}>
            {upcoming.length}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            waiting to run
          </p>
        </div>
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Need a slot</span>
          <p className="dash-stat-value" style={{ marginTop: 8 }}>
            {pendingWithoutDemo.length}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            pending users without a demo
          </p>
        </div>
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Calendar</span>
          <p className="dash-meeting-cal-stat">
            <span className={`dash-status-dot dash-status-dot--${calendarState}`} />
            {calendarState === "connected"
              ? "Connected"
              : calendarState === "ready"
                ? "Not linked"
                : calendarState === "missing"
                  ? "Not set up"
                  : "Checking"}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            {calendar?.googleEmail ?? "Meet links after connect"}
          </p>
        </div>
      </div>

      <div className="card card--elevated dash-meeting-cal">
        <div>
          <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
            Google Calendar
          </p>
          <p className="dash-muted">
            {calendarState === "connected"
              ? `Invites go to ${calendar?.googleEmail} with a Meet link.`
              : calendarState === "ready"
                ? "Connect so new demos get a Calendar event and Google Meet link."
                : calendarState === "missing"
                  ? "OAuth is not configured on the API yet."
                  : "Checking connection…"}
          </p>
        </div>
        {calendar?.connected ? (
          <button type="button" className="btn-ghost btn-sm" onClick={() => void handleDisconnect()}>
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => void connectCalendar()}
            disabled={calendar != null && !calendar.configured}
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      <div className="card card--elevated" style={{ padding: "0.875rem 1rem" }}>
        <div className="dash-meeting-toolbar">
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
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pendingUsers.length === 0}
            onClick={() => {
              const first = pendingWithoutDemo[0] ?? pendingUsers[0];
              if (first) setScheduleUser(first);
            }}
          >
            Schedule demo
          </button>
        </div>
        <input
          type="search"
          className="dash-input"
          style={{ marginTop: "0.75rem" }}
          placeholder="Search guest, email, or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {pendingWithoutDemo.length > 0 && (
          <div className="dash-meeting-pending">
            <p className="dash-label">Pending without a demo</p>
            <div className="dash-meeting-pending__list">
              {pendingWithoutDemo.slice(0, 8).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="dash-meeting-pending__chip"
                  onClick={() => setScheduleUser(u)}
                >
                  {u.name}
                  <span className="dash-muted">
                    {ADMIN_ROLE_LABELS[u.role as AdminUserRole] ?? u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        <div className="dash-panel-head">
          <div>
            <p className="dash-panel-head__title">
              {filter === "TODAY" ? "Today’s agenda" : "Meetings"}
            </p>
            <p className="dash-muted" style={{ marginTop: 2 }}>
              {loading
                ? "Loading…"
                : `${visibleMeetings.length} showing${search ? " (filtered)" : ""}`}
            </p>
          </div>
        </div>
        {loading && meetings.length === 0 ? (
          <p className="dash-muted" style={{ padding: "1.5rem", textAlign: "center" }}>
            Loading meetings…
          </p>
        ) : visibleMeetings.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 220 }}>
            <div className="dash-empty__icon">
              <i className="ti ti-calendar-event" style={{ fontSize: 24 }} aria-hidden="true" />
            </div>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              {search ? "No meetings match your search" : "No meetings in this list"}
            </p>
            {pendingUsers.length > 0 && !search && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setScheduleUser(pendingWithoutDemo[0] ?? pendingUsers[0])}
              >
                Schedule the next demo
              </button>
            )}
          </div>
        ) : (
          <div className="dash-meeting-list">
            {visibleMeetings.map((m) => (
              <AdminMeetingCard
                key={m.id}
                meeting={m}
                busy={actingId === m.id}
                onJoin={(meeting) => window.open(meeting.meetLink ?? "", "_blank", "noopener,noreferrer")}
                onCopyMeet={(meeting) => void copyMeet(meeting)}
                onOpenCalendar={(meeting) =>
                  window.open(meeting.calendarHtmlLink ?? "", "_blank", "noopener,noreferrer")
                }
                onReschedule={openReschedule}
                onConclude={setCompleteMeeting}
                onCancel={(meeting) => void handleCancel(meeting)}
              />
            ))}
          </div>
        )}

        {!loading && meetings.length > 0 && filter !== "TODAY" && (
          <div
            className="dash-form-actions"
            style={{
              justifyContent: "space-between",
              padding: "0.625rem 0.75rem",
              borderTop: "0.5px solid var(--color-border)",
            }}
          >
            <span className="dash-muted">
              Page {page + 1} of {totalPages} · {totalElements} meetings
            </span>
            <div className="dash-form-actions" style={{ margin: 0 }}>
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
          </div>
        )}
      </div>

      <ScheduleMeetingModal
        open={Boolean(scheduleUser)}
        user={scheduleUser}
        meeting={rescheduleMeeting}
        submitting={submitting}
        onClose={() => {
          setScheduleUser(null);
          setRescheduleMeeting(null);
        }}
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
