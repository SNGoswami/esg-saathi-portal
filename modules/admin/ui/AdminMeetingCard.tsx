"use client";

import type { DemoMeeting } from "@/modules/admin/api/adminApi";
import {
  decisionLabel,
  durationMinutes,
  formatClock,
  inviteChannel,
  isMeetingLive,
  relativeWhen,
  statusChipClass,
  statusLabel,
} from "@/modules/admin/ui/meetingHelpers";

type AdminMeetingCardProps = {
  meeting: DemoMeeting;
  compact?: boolean;
  busy?: boolean;
  onJoin?: (meeting: DemoMeeting) => void;
  onCopyMeet?: (meeting: DemoMeeting) => void;
  onOpenCalendar?: (meeting: DemoMeeting) => void;
  onReschedule?: (meeting: DemoMeeting) => void;
  onConclude?: (meeting: DemoMeeting) => void;
  onCancel?: (meeting: DemoMeeting) => void;
};

export default function AdminMeetingCard({
  meeting,
  compact,
  busy,
  onJoin,
  onCopyMeet,
  onOpenCalendar,
  onReschedule,
  onConclude,
  onCancel,
}: AdminMeetingCardProps) {
  const live = isMeetingLive(meeting);
  const mins = durationMinutes(meeting);
  const decision = decisionLabel(meeting.decision);
  const scheduled = meeting.status === "SCHEDULED";
  const hasActions =
    scheduled &&
    Boolean(
      (meeting.meetLink && onJoin) ||
        onConclude ||
        onReschedule ||
        (meeting.meetLink && onCopyMeet) ||
        (meeting.calendarHtmlLink && onOpenCalendar) ||
        onCancel,
    );

  return (
    <article className={`dash-meeting-card${live ? " dash-meeting-card--live" : ""}`}>
      <div className="dash-meeting-card__when">
        <span className="dash-meeting-card__clock">{formatClock(meeting.startsAt)}</span>
        <span className="dash-muted">{mins ? `${mins} min` : ""}</span>
      </div>
      <div className="dash-meeting-card__body">
        <div className="dash-meeting-card__topline">
          <p className="dash-meeting-card__guest">{meeting.userName || meeting.userEmail || "Guest"}</p>
          {live ? (
            <span className="dash-chip dash-chip--live">Live</span>
          ) : (
            <span className={statusChipClass(meeting.status)}>{statusLabel(meeting.status)}</span>
          )}
        </div>
        <p className="dash-muted dash-meeting-card__meta">
          {relativeWhen(meeting.startsAt)}
          {meeting.userEmail ? ` · ${meeting.userEmail}` : ""}
        </p>
        {!compact && meeting.title ? (
          <p className="dash-meeting-card__title">{meeting.title}</p>
        ) : null}
        {!compact && meeting.notes ? (
          <p className="dash-muted dash-meeting-card__notes">{meeting.notes}</p>
        ) : null}
        <div className="dash-meeting-card__tags">
          <span className="dash-chip">{inviteChannel(meeting)}</span>
          {decision ? (
            <span className={meeting.decision === "REJECT" ? "dash-chip dash-chip--danger" : "dash-chip dash-chip--success"}>
              {decision}
            </span>
          ) : null}
        </div>
      </div>
      {hasActions ? (
        <div className="dash-meeting-card__actions">
          {scheduled && meeting.meetLink && onJoin ? (
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => onJoin(meeting)}>
              Join Meet
            </button>
          ) : null}
          {scheduled && onConclude ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onConclude(meeting)}>
              Conclude
            </button>
          ) : null}
          {scheduled && onReschedule ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onReschedule(meeting)}>
              Reschedule
            </button>
          ) : null}
          {scheduled && meeting.meetLink && onCopyMeet ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onCopyMeet(meeting)}>
              Copy link
            </button>
          ) : null}
          {scheduled && meeting.calendarHtmlLink && onOpenCalendar ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onOpenCalendar(meeting)}>
              Calendar
            </button>
          ) : null}
          {scheduled && onCancel ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onCancel(meeting)}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
