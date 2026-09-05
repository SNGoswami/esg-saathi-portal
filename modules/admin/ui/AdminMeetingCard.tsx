"use client";

import type { DemoMeeting } from "@/modules/admin/api/adminApi";
import {
  formatClock,
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
  onReschedule?: (meeting: DemoMeeting) => void;
  onConclude?: (meeting: DemoMeeting) => void;
  onCancel?: (meeting: DemoMeeting) => void;
};

export default function AdminMeetingCard({
  meeting,
  compact,
  busy,
  onJoin,
  onReschedule,
  onConclude,
  onCancel,
}: AdminMeetingCardProps) {
  const live = isMeetingLive(meeting);
  const scheduled = meeting.status === "SCHEDULED";

  return (
    <article className={`dash-meeting-card${live ? " dash-meeting-card--live" : ""}`}>
      <div className="dash-meeting-card__when">
        <span className="dash-meeting-card__clock">{formatClock(meeting.startsAt)}</span>
      </div>
      <div className="dash-meeting-card__body">
        <div className="dash-meeting-card__topline">
          <p className="dash-meeting-card__guest">{meeting.title || "Product demo"}</p>
          {live ? (
            <span className="dash-chip dash-chip--live">Live</span>
          ) : (
            <span className={statusChipClass(meeting.status)}>{statusLabel(meeting.status)}</span>
          )}
        </div>
        <p className="dash-muted dash-meeting-card__meta">
          {meeting.userName || meeting.userEmail || "Guest"}
          {" · "}
          {relativeWhen(meeting.startsAt)}
        </p>
        {!compact && meeting.userEmail ? (
          <p className="dash-muted dash-meeting-card__meta">{meeting.userEmail}</p>
        ) : null}
      </div>
      {scheduled ? (
        <div className="dash-meeting-card__actions">
          {meeting.meetLink && onJoin ? (
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => onJoin(meeting)}>
              Join
            </button>
          ) : null}
          {onConclude ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onConclude(meeting)}>
              Done
            </button>
          ) : null}
          {onReschedule ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onReschedule(meeting)}>
              Change
            </button>
          ) : null}
          {onCancel ? (
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onCancel(meeting)}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
