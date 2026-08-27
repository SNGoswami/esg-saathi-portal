import type { DemoMeeting, DemoMeetingStatus, MeetingDecision } from "@/modules/admin/api/adminApi";

const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
const DAY: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };

export function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function formatClock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, TIME);
  } catch {
    return iso;
  }
}

export function durationMinutes(meeting: Pick<DemoMeeting, "startsAt" | "endsAt">) {
  const mins = Math.round(
    (new Date(meeting.endsAt).getTime() - new Date(meeting.startsAt).getTime()) / 60000,
  );
  return Math.max(mins, 0);
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isMeetingLive(meeting: Pick<DemoMeeting, "startsAt" | "endsAt" | "status">) {
  if (meeting.status !== "SCHEDULED") return false;
  const now = Date.now();
  return new Date(meeting.startsAt).getTime() <= now && now <= new Date(meeting.endsAt).getTime();
}

export function isMeetingToday(meeting: Pick<DemoMeeting, "startsAt">, now = new Date()) {
  return isSameDay(new Date(meeting.startsAt), now);
}

export function relativeWhen(iso: string, now = new Date()) {
  const start = new Date(iso);
  const diffMs = start.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= -1 && diffMin > -180) return "In progress";
  if (diffMin >= 0 && diffMin < 1) return "Starting now";
  if (diffMin >= 1 && diffMin < 60) return `In ${diffMin} min`;
  if (diffMin >= 60 && diffMin < 180) {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins ? `In ${hours}h ${mins}m` : `In ${hours}h`;
  }
  if (isSameDay(start, now)) return `Today · ${formatClock(iso)}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(start, tomorrow)) return `Tomorrow · ${formatClock(iso)}`;
  return `${start.toLocaleDateString(undefined, DAY)} · ${formatClock(iso)}`;
}

export function statusChipClass(status: DemoMeetingStatus) {
  if (status === "SCHEDULED") return "dash-chip dash-chip--warning";
  if (status === "COMPLETED") return "dash-chip dash-chip--success";
  if (status === "CANCELLED" || status === "NO_SHOW") return "dash-chip dash-chip--danger";
  return "dash-chip";
}

export function statusLabel(status: DemoMeetingStatus) {
  if (status === "NO_SHOW") return "No show";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function decisionLabel(decision: MeetingDecision | null | undefined) {
  if (decision === "APPROVE") return "Approved";
  if (decision === "REJECT") return "Rejected";
  if (decision === "DEFER") return "Deferred";
  return null;
}

export function inviteChannel(meeting: Pick<DemoMeeting, "meetLink" | "googleSynced">) {
  if (meeting.meetLink) return "Google Meet";
  if (meeting.googleSynced) return "Calendar";
  return "Email only";
}
