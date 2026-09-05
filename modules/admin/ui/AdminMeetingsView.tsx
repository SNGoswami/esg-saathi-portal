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
  type GoogleCalendarStatus,
  type MeetingDecision,
} from "@/modules/admin/api/adminApi";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import ScheduleMeetingModal from "@/modules/admin/ui/ScheduleMeetingModal";
import CompleteMeetingModal from "@/modules/admin/ui/CompleteMeetingModal";
import AdminMeetingCard from "@/modules/admin/ui/AdminMeetingCard";
import AdminMeetingWeekCalendar from "@/modules/admin/ui/AdminMeetingWeekCalendar";
import { AdminPage, AdminSurface } from "@/modules/admin/ui/AdminChrome";
import { startOfWeek } from "@/modules/admin/ui/meetingHelpers";

export default function AdminMeetingsView() {
  const toast = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [board, setBoard] = useState<DemoMeeting[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [calendar, setCalendar] = useState<GoogleCalendarStatus | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUserListItem[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleUser, setScheduleUser] = useState<AdminUserListItem | null>(null);
  const [presetStartsAt, setPresetStartsAt] = useState<string | undefined>();
  const [rescheduleMeeting, setRescheduleMeeting] = useState<DemoMeeting | null>(null);
  const [completeMeeting, setCompleteMeeting] = useState<DemoMeeting | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useToastOnValue(error, "error");

  const selected = board.find((m) => m.id === selectedId) ?? null;

  const loadCalendar = useCallback(async () => {
    try {
      setCalendar(await getGoogleCalendarStatus());
    } catch {
      setCalendar({ configured: false, connected: false, googleEmail: null });
    }
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const [scheduled, completed] = await Promise.all([
        listAdminMeetings("SCHEDULED", 0, 100),
        listAdminMeetings("COMPLETED", 0, 100),
      ]);
      setBoard([...(scheduled.content ?? []), ...(completed.content ?? [])]);
    } catch {
      setBoard([]);
    }
  }, []);

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

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPending(), loadBoard()]);
  }, [loadPending, loadBoard]);

  useEffect(() => {
    void loadCalendar();
    void loadPending();
    void loadBoard();
  }, [loadCalendar, loadPending, loadBoard]);

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
    setPresetStartsAt(undefined);
  }

  function openCreate(datetimeLocal?: string) {
    setScheduleUser(null);
    setRescheduleMeeting(null);
    setPresetStartsAt(datetimeLocal);
    setScheduleOpen(true);
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
      await refreshAll();
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
      if (selectedId === meeting.id) setSelectedId(null);
      await refreshAll();
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
      if (selectedId === completeMeeting.id) setSelectedId(null);
      await refreshAll();
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
    setPresetStartsAt(undefined);
    setScheduleOpen(true);
  }

  const calendarMeta = calendar?.connected
    ? calendar.googleEmail
    : calendar?.configured
      ? "Connect Calendar for Meet links"
      : "Invites are emailed without Meet until Calendar is connected";

  return (
    <AdminPage
      title="Meetings"
      meta={calendarMeta}
      actions={
        <>
          {calendar?.connected ? (
            <button type="button" className="admin-link-btn" onClick={() => void handleDisconnect()}>
              Disconnect Calendar
            </button>
          ) : (
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => void connectCalendar()}
              disabled={calendar != null && !calendar.configured}
            >
              Connect Calendar
            </button>
          )}
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pendingUsers.length === 0}
            onClick={() => openCreate()}
          >
            Schedule
          </button>
        </>
      }
    >
      <div className={`admin-meetings${selected ? " is-split" : ""}`}>
        <AdminSurface>
          <AdminMeetingWeekCalendar
            meetings={board}
            weekStart={weekStart}
            selectedId={selectedId}
            canCreate={pendingUsers.length > 0}
            onWeekStartChange={setWeekStart}
            onSelect={(meeting) => setSelectedId(meeting.id)}
            onCreateAt={(datetimeLocal) => openCreate(datetimeLocal)}
          />
        </AdminSurface>

        {selected ? (
          <AdminSurface padded>
            <AdminMeetingCard
              meeting={selected}
              busy={actingId === selected.id}
              onJoin={(meeting) => window.open(meeting.meetLink ?? "", "_blank", "noopener,noreferrer")}
              onReschedule={openReschedule}
              onConclude={setCompleteMeeting}
              onCancel={(meeting) => void handleCancel(meeting)}
            />
          </AdminSurface>
        ) : (
          <p className="admin-quiet" style={{ margin: 0 }}>
            {pendingUsers.length > 0
              ? "Select a meeting, or click an empty time to schedule."
              : "Select a meeting to join, change, or mark it done."}
          </p>
        )}
      </div>

      <ScheduleMeetingModal
        open={scheduleOpen}
        user={scheduleUser}
        guests={guests}
        meeting={rescheduleMeeting}
        presetStartsAt={presetStartsAt}
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
    </AdminPage>
  );
}
