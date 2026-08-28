"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoMeeting } from "@/modules/admin/api/adminApi";
import {
  addDays,
  formatClock,
  isMeetingLive,
  isSameDay,
  startOfWeek,
  weekDays,
} from "@/modules/admin/ui/meetingHelpers";

const PX = 72;
const DEFAULT_START = 8;
const DEFAULT_END = 20;
const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const MONTH_DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const RANGE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

type AdminMeetingWeekCalendarProps = {
  meetings: DemoMeeting[];
  weekStart: Date;
  selectedId?: string | null;
  canCreate?: boolean;
  onWeekStartChange: (next: Date) => void;
  onSelect: (meeting: DemoMeeting) => void;
  onCreateAt?: (datetimeLocal: string) => void;
};

function hourLabel(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocal(day: Date, hour: number) {
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`;
}

function inWeek(meeting: DemoMeeting, days: Date[]) {
  const start = new Date(meeting.startsAt);
  return days.some((day) => isSameDay(day, start));
}

function layoutForDay(
  meetings: DemoMeeting[],
  day: Date,
  startHour: number,
  px: number,
) {
  const items = meetings
    .filter((m) => isSameDay(new Date(m.startsAt), day))
    .map((meeting) => {
      const start = new Date(meeting.startsAt);
      const end = new Date(meeting.endsAt);
      const startH = start.getHours() + start.getMinutes() / 60;
      const endH = end.getHours() + end.getMinutes() / 60;
      const from = Math.max(startH - startHour, 0);
      const to = Math.max(endH - startHour, from + 0.5);
      return { meeting, from, to };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to);

  const colEnds: number[] = [];
  const placed = items.map((item) => {
    let col = colEnds.findIndex((end) => end <= item.from + 0.02);
    if (col < 0) {
      col = colEnds.length;
      colEnds.push(item.to);
    } else {
      colEnds[col] = item.to;
    }
    return { ...item, col };
  });
  const colCount = Math.max(colEnds.length, 1);
  return placed.map((item) => ({
    meeting: item.meeting,
    top: item.from * px,
    height: Math.max((item.to - item.from) * px - 4, 44),
    col: item.col,
    colCount,
  }));
}

export default function AdminMeetingWeekCalendar({
  meetings,
  weekStart,
  selectedId,
  canCreate,
  onWeekStartChange,
  onSelect,
  onCreateAt,
}: AdminMeetingWeekCalendarProps) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  const weekMeetings = useMemo(
    () => meetings.filter((m) => m.status !== "CANCELLED" && inWeek(m, days)),
    [meetings, days],
  );

  const { startHour, endHour } = useMemo(() => {
    let start = DEFAULT_START;
    let end = DEFAULT_END;
    for (const meeting of weekMeetings) {
      start = Math.min(start, new Date(meeting.startsAt).getHours());
      end = Math.max(end, new Date(meeting.endsAt).getHours() + 1);
    }
    start = Math.max(0, start);
    end = Math.min(24, Math.max(end, start + 8));
    return { startHour: start, endHour: end };
  }, [weekMeetings]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const today = new Date();
    if (!days.some((d) => isSameDay(d, today))) return;
    const offset = (today.getHours() + today.getMinutes() / 60 - startHour - 1) * PX;
    el.scrollTop = Math.max(0, offset);
  }, [days, startHour, weekStart]);

  const rangeLabel = `${RANGE.format(days[0])} – ${RANGE.format(days[6])}`;
  const todayInWeek = days.some((d) => isSameDay(d, now));
  const nowTop =
    (now.getHours() + now.getMinutes() / 60 - startHour) * PX;
  const showNow = todayInWeek && nowTop >= 0 && nowTop <= hours.length * PX;

  return (
    <div className="dash-week-cal">
      <div className="dash-week-cal__nav">
        <div className="dash-week-cal__nav-left">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onWeekStartChange(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </button>
          <p className="dash-week-cal__range">{rangeLabel}</p>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onWeekStartChange(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => onWeekStartChange(startOfWeek(new Date()))}
        >
          Today
        </button>
      </div>

      <div className="dash-week-cal__scroll" ref={bodyRef}>
        <div className="dash-week-cal__grid" style={{ ["--week-hours" as string]: String(hours.length) }}>
          <div className="dash-week-cal__corner" />
          {days.map((day) => {
            const today = isSameDay(day, now);
            return (
              <div
                key={day.toISOString()}
                className={`dash-week-cal__head${today ? " is-today" : ""}`}
              >
                <span className="dash-week-cal__dow">{WEEKDAY.format(day)}</span>
                <span className={`dash-week-cal__date${today ? " is-today" : ""}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}

          <div
            className="dash-week-cal__gutter"
            style={{ gridRow: `2 / span ${hours.length}` }}
          >
            {hours.map((hour) => (
              <div key={hour} className="dash-week-cal__hour" style={{ height: PX }}>
                {hourLabel(hour)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const laid = layoutForDay(weekMeetings, day, startHour, PX);
            const today = isSameDay(day, now);
            return (
              <div
                key={`col-${day.toISOString()}`}
                className="dash-week-cal__col"
                style={{ gridRow: `2 / span ${hours.length}` }}
              >
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className="dash-week-cal__slot"
                    style={{ height: PX }}
                    disabled={!canCreate}
                    aria-label={`Schedule at ${hourLabel(hour)} on ${MONTH_DAY.format(day)}`}
                    onClick={() => onCreateAt?.(toDatetimeLocal(day, hour))}
                  />
                ))}
                {today && showNow ? (
                  <div className="dash-week-cal__now" style={{ top: nowTop }}>
                    <span className="dash-week-cal__now-dot" />
                  </div>
                ) : null}
                {laid.map((item) => {
                  const live = isMeetingLive(item.meeting);
                  const done = item.meeting.status === "COMPLETED";
                  const selected = item.meeting.id === selectedId;
                  const compact = item.height < 56;
                  const title = item.meeting.title || "Product demo";
                  const guest = item.meeting.userName || item.meeting.userEmail || "Guest";
                  const time = formatClock(item.meeting.startsAt);
                  const width = `calc((100% - 8px) / ${item.colCount})`;
                  const left = `calc(${item.col} * (100% - 8px) / ${item.colCount} + 4px)`;
                  return (
                    <button
                      key={item.meeting.id}
                      type="button"
                      className={`dash-week-cal__event${live ? " is-live" : ""}${done ? " is-done" : ""}${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}`}
                      style={{ top: item.top, height: item.height, width, left }}
                      title={`${time} · ${title} · ${guest}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item.meeting);
                      }}
                    >
                      {compact ? (
                        <span className="dash-week-cal__event-title">
                          {time} · {guest}
                        </span>
                      ) : (
                        <>
                          <span className="dash-week-cal__event-time">{time}</span>
                          <span className="dash-week-cal__event-title">{title}</span>
                          <span className="dash-week-cal__event-guest">{guest}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
