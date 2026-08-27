"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminReplyModal from "@/modules/admin/ui/AdminReplyModal";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import {
  ADMIN_CONTACT_PAGE_SIZE,
  completeAdminMeeting,
  getGoogleCalendarStatus,
  listAdminContacts,
  listAdminMeetings,
  listPendingAdminUsers,
  listAdminWaitlist,
  sendWaitlistUpdate,
  type AdminContact,
  type AdminWaitlistEntry,
  type DemoMeeting,
  type GoogleCalendarStatus,
  type MeetingDecision,
} from "@/modules/admin/api/adminApi";
import AdminMeetingCard from "@/modules/admin/ui/AdminMeetingCard";
import CompleteMeetingModal from "@/modules/admin/ui/CompleteMeetingModal";
import { isMeetingToday, relativeWhen } from "@/modules/admin/ui/meetingHelpers";
import {
  readAdminContactsCache,
  readAdminWaitlistCache,
  writeAdminContactsCache,
  writeAdminWaitlistCache,
} from "@/modules/admin/api/adminDashboardCache";

function formatContactDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function readInitialDashboard() {
  if (typeof window === "undefined") {
    return { contacts: null, waitlist: null };
  }
  return {
    contacts: readAdminContactsCache(0),
    waitlist: readAdminWaitlistCache(),
  };
}

function ContactCard({
  contact,
  expanded,
  onToggleExpand,
  onReply,
  onCopy,
}: {
  contact: AdminContact;
  expanded: boolean;
  onToggleExpand: () => void;
  onReply: (c: AdminContact) => void;
  onCopy: (text: string) => void;
}) {
  return (
    <article className="dash-admin-contact-card">
      <div className="dash-admin-contact-card__body">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem" }}>
          <span className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
            {contact.name}
          </span>
          {contact.replied && <span className="dash-chip dash-chip--success">Replied</span>}
        </div>
        <p className="dash-muted">{contact.email}</p>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text)" }}>{contact.subject}</p>
        {expanded && (
          <p className="dash-muted" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {contact.message}
          </p>
        )}
      </div>
      <div className="dash-admin-contact-card__actions">
        <span className="dash-muted">{formatContactDate(contact.createdAt)}</span>
        <div className="dash-form-actions" style={{ margin: 0 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onToggleExpand}>
            {expanded ? "Less" : "More"}
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => onCopy(contact.email)}>
            Copy
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={contact.replied}
            onClick={() => onReply(contact)}
          >
            {contact.replied ? "Replied" : "Reply"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminDashboardView({
  onNavigateView,
}: {
  onNavigateView?: (view: string) => void;
}) {
  const initial = readInitialDashboard();
  const hasInitialCache = initial.contacts !== null && initial.waitlist !== null;

  const [contacts, setContacts] = useState<AdminContact[]>(initial.contacts?.contacts ?? []);
  const [waitlist, setWaitlist] = useState<AdminWaitlistEntry[]>(initial.waitlist ?? []);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initial.contacts?.hasMore ?? true);
  const [totalContacts, setTotalContacts] = useState(initial.contacts?.totalContacts ?? 0);
  const [loading, setLoading] = useState(!hasInitialCache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [replyTarget, setReplyTarget] = useState<AdminContact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);
  const [upcoming, setUpcoming] = useState<DemoMeeting[]>([]);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [unbookedPending, setUnbookedPending] = useState(0);
  const [calendar, setCalendar] = useState<GoogleCalendarStatus | null>(null);
  const [completeMeeting, setCompleteMeeting] = useState<DemoMeeting | null>(null);
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();

  const persistContactsState = useCallback(
    (nextContacts: AdminContact[], targetPage: number, nextHasMore: boolean, total: number) => {
      setContacts(nextContacts);
      setPage(targetPage);
      setHasMore(nextHasMore);
      setTotalContacts(total);
      writeAdminContactsCache(targetPage, {
        contacts:
          targetPage === 0
            ? nextContacts.slice(0, ADMIN_CONTACT_PAGE_SIZE)
            : nextContacts.slice(
                targetPage * ADMIN_CONTACT_PAGE_SIZE,
                (targetPage + 1) * ADMIN_CONTACT_PAGE_SIZE,
              ),
        hasMore: nextHasMore,
        totalContacts: total,
      });
    },
    [],
  );

  const applyWaitlist = useCallback((entries: AdminWaitlistEntry[]) => {
    setWaitlist(entries);
    writeAdminWaitlistCache(entries);
  }, []);

  const load = useCallback(
    async (options?: { skipCache?: boolean; silent?: boolean }) => {
      const cachedContacts = readAdminContactsCache(0);
      const cachedWaitlist = readAdminWaitlistCache();

      if (!options?.skipCache && cachedContacts && cachedWaitlist) {
        persistContactsState(cachedContacts.contacts, 0, cachedContacts.hasMore, cachedContacts.totalContacts);
        applyWaitlist(cachedWaitlist);
        if (!options?.silent) {
          setLoading(false);
        }
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [cData, wData] = await Promise.all([listAdminContacts(0), listAdminWaitlist()]);
        persistContactsState(cData.content, 0, !cData.last, cData.totalElements);
        applyWaitlist(wData);
      } catch (err) {
        if (!options?.silent) {
          toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!options?.silent) setLoading(false);
        else setRefreshing(false);
      }
    },
    [applyWaitlist, persistContactsState, toast],
  );

  useEffect(() => {
    if (hasInitialCache) {
      void load({ skipCache: true, silent: true });
      return;
    }
    void load();
  }, [hasInitialCache, load]);

  const loadMeetings = useCallback(async () => {
    try {
      const [scheduled, pending, status] = await Promise.all([
        listAdminMeetings("SCHEDULED", 0, 8),
        listPendingAdminUsers(0, 100),
        getGoogleCalendarStatus().catch(() => ({
          configured: false,
          connected: false,
          googleEmail: null,
        })),
      ]);
      const nextUpcoming = [...(scheduled.content ?? [])].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
      const pendingUsers = pending.content ?? [];
      const booked = new Set(nextUpcoming.map((m) => m.userId));
      setUpcoming(nextUpcoming);
      setPendingUserCount(pending.totalElements ?? pendingUsers.length);
      setUnbookedPending(pendingUsers.filter((u) => !booked.has(u.id)).length);
      setCalendar(status);
    } catch {
      setUpcoming([]);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  async function refresh() {
    await Promise.all([load({ skipCache: true, silent: true }), loadMeetings()]);
    toast.success("Dashboard refreshed");
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;

    const next = page + 1;
    const cached = readAdminContactsCache(next);
    if (cached) {
      setContacts((prev) => [...prev, ...cached.contacts]);
      setPage(next);
      setHasMore(cached.hasMore);
      setTotalContacts(cached.totalContacts);
      return;
    }

    setLoadingMore(true);
    try {
      const data = await listAdminContacts(next);
      const merged = [...contacts, ...data.content];
      persistContactsState(merged, next, !data.last, data.totalElements);
      writeAdminContactsCache(next, {
        contacts: data.content,
        hasMore: !data.last,
        totalContacts: data.totalElements,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load more contacts");
    } finally {
      setLoadingMore(false);
    }
  }

  function loadLess() {
    const trimmed = contacts.slice(0, ADMIN_CONTACT_PAGE_SIZE);
    persistContactsState(
      trimmed,
      0,
      contacts.length > ADMIN_CONTACT_PAGE_SIZE || totalContacts > ADMIN_CONTACT_PAGE_SIZE,
      totalContacts,
    );
  }

  function handleReplied(id: number) {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, replied: true } : c));
      writeAdminContactsCache(0, {
        contacts: next.slice(0, ADMIN_CONTACT_PAGE_SIZE),
        hasMore,
        totalContacts,
      });
      return next;
    });
  }

  const pendingCount = useMemo(
    () => contacts.filter((c) => !c.replied).length,
    [contacts],
  );

  const filteredContacts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q),
    );
  }, [contacts, searchTerm]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function handleCompleteMeeting(payload: { conclusion: string; decision: MeetingDecision }) {
    if (!completeMeeting) return;
    setSubmittingMeeting(true);
    try {
      await completeAdminMeeting(completeMeeting.id, payload);
      toast.success(
        payload.decision === "APPROVE"
          ? "Demo recorded and account approved"
          : payload.decision === "REJECT"
            ? "Demo recorded and account rejected"
            : "Demo conclusion saved",
      );
      setCompleteMeeting(null);
      await loadMeetings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record conclusion");
    } finally {
      setSubmittingMeeting(false);
    }
  }

  const nextDemo = upcoming[0] ?? null;
  const todayDemos = upcoming.filter((m) => isMeetingToday(m)).length;

  async function sendWaitlistNotification() {
    const subject = notifySubject.trim();
    const message = notifyMessage.trim();
    if (!subject || !message) {
      toast.error("Subject and message are required");
      return;
    }

    const recipientCount = waitlist.length;
    const ok = await confirm({
      title: "Send waitlist update?",
      description: (
        <>
          This will email <strong>{recipientCount}</strong> waitlist subscriber
          {recipientCount !== 1 ? "s" : ""} with subject &ldquo;{subject}&rdquo;.
        </>
      ),
      confirmLabel: "Send update",
    });
    if (!ok) return;

    setSendingNotify(true);
    try {
      const result = await sendWaitlistUpdate({ subject, message });
      setNotifySubject("");
      setNotifyMessage("");
      toast.success(
        `Update sent to ${result.count ?? waitlist.length} subscriber${(result.count ?? waitlist.length) !== 1 ? "s" : ""}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send update");
    } finally {
      setSendingNotify(false);
    }
  }

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="dash-welcome-card__eyebrow">Administrator</p>
          <p className="dash-welcome-card__title">Contact inbox & waitlist notifications</p>
          <p className="dash-muted" style={{ marginTop: 6 }}>
            {loading && contacts.length === 0
              ? "Loading…"
              : refreshing
                ? "Refreshing…"
                : "Reply to contacts, run product demos, and email waitlist subscribers."}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={refreshing || loading}
          onClick={() => void refresh()}
        >
          <i className="ti ti-refresh" style={{ marginRight: 6, fontSize: 14 }} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="dash-grid-stats">
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Pending replies</span>
          <p className="dash-stat-value" style={{ color: "var(--brand-700)", marginTop: 8 }}>
            {pendingCount}
          </p>
          <span className="dash-score-card__delta" style={{ marginTop: "0.5rem", display: "inline-block" }}>
            {totalContacts} total requests
          </span>
        </div>
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Waitlist</span>
          <p className="dash-stat-value" style={{ color: "var(--brand-600)", marginTop: 8 }}>
            {waitlist.length}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            subscribers for broadcast
          </p>
        </div>
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Upcoming demos</span>
          <p className="dash-stat-value" style={{ color: "var(--brand-700)", marginTop: 8 }}>
            {upcoming.length}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            {todayDemos} today · {unbookedPending} pending without a slot
          </p>
        </div>
        <div className="card card--elevated dash-score-card">
          <span className="dash-score-card__label">Next demo</span>
          <p className="dash-meeting-cal-stat" style={{ marginTop: 8 }}>
            {nextDemo ? relativeWhen(nextDemo.startsAt) : "None booked"}
          </p>
          <p className="dash-muted" style={{ marginTop: "0.35rem" }}>
            {nextDemo ? nextDemo.userName || nextDemo.userEmail : `${pendingUserCount} awaiting approval`}
          </p>
        </div>
      </div>

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        <div className="dash-panel-head">
          <div>
            <p className="dash-panel-head__title">Meeting control</p>
            <p className="dash-muted" style={{ marginTop: 2 }}>
              {calendar?.connected
                ? `Calendar connected as ${calendar.googleEmail}`
                : calendar?.configured
                  ? "Calendar not connected — invites are email-only"
                  : "Join, conclude, or open the full meetings board"}
            </p>
          </div>
          <button
            type="button"
            className="dash-panel-head__link"
            onClick={() => onNavigateView?.("meetings")}
          >
            Open meetings
          </button>
        </div>
        {upcoming.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 140, padding: "1.5rem 1rem" }}>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              No upcoming demos
            </p>
            <p className="dash-muted">
              {unbookedPending > 0
                ? `${unbookedPending} pending user${unbookedPending === 1 ? "" : "s"} still need a slot.`
                : "Schedule a demo from Meetings when a signup is waiting."}
            </p>
            <button type="button" className="btn-primary btn-sm" onClick={() => onNavigateView?.("meetings")}>
              Schedule a demo
            </button>
          </div>
        ) : (
          <div className="dash-meeting-list dash-meeting-list--dash">
            {upcoming.slice(0, 4).map((m) => (
              <AdminMeetingCard
                key={m.id}
                meeting={m}
                compact
                onJoin={(meeting) => window.open(meeting.meetLink ?? "", "_blank", "noopener,noreferrer")}
                onCopyMeet={(meeting) => {
                  if (!meeting.meetLink) return;
                  void copyText(meeting.meetLink);
                }}
                onConclude={setCompleteMeeting}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        <div className="dash-panel-head">
          <div>
            <p className="dash-panel-head__title">Contact requests</p>
            <p className="dash-muted" style={{ marginTop: 2 }}>
              {loading ? "Loading…" : `${filteredContacts.length} showing · ${pendingCount} unreplied`}
            </p>
          </div>
        </div>
        <div style={{ padding: "0 1rem 0.75rem" }}>
          <input
            type="search"
            className="dash-input"
            placeholder="Search by name, email, or subject…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading && contacts.length === 0}
          />
        </div>
        {loading && contacts.length === 0 ? (
          <p className="dash-muted" style={{ padding: "1.5rem", textAlign: "center" }}>
            Loading contacts…
          </p>
        ) : filteredContacts.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 200, padding: "2rem 1rem" }}>
            <div className="dash-empty__icon">
              <i className="ti ti-mail" style={{ fontSize: 24 }} aria-hidden="true" />
            </div>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              {searchTerm ? "No contacts match your search" : "No contact requests yet"}
            </p>
          </div>
        ) : (
          <div className="dash-admin-contact-grid">
            {filteredContacts.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                expanded={expandedIds.has(c.id)}
                onToggleExpand={() => toggleExpanded(c.id)}
                onReply={setReplyTarget}
                onCopy={(text) => void copyText(text)}
              />
            ))}
          </div>
        )}
        {(hasMore || contacts.length > ADMIN_CONTACT_PAGE_SIZE) && (
          <div className="dash-form-actions" style={{ justifyContent: "center", padding: "0.75rem 1rem 1rem" }}>
            {contacts.length > ADMIN_CONTACT_PAGE_SIZE && (
              <button type="button" className="btn-ghost btn-sm" onClick={loadLess}>
                Show less
              </button>
            )}
            {hasMore && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="dash-grid-admin-bottom">
        <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dash-panel-head">
            <p className="dash-panel-head__title">Waitlist ({waitlist.length})</p>
          </div>
          <div className="dash-admin-waitlist">
            {waitlist.length === 0 ? (
              <p className="dash-muted" style={{ textAlign: "center", padding: "1.5rem 0" }}>
                No waitlist entries
              </p>
            ) : (
              waitlist.map((w, i) => (
                <div key={w.id} className="dash-admin-waitlist__row">
                  <span className="dash-admin-waitlist__index">{i + 1}</span>
                  <span className="dash-muted" style={{ flex: 1, wordBreak: "break-all", fontSize: "0.75rem", color: "var(--color-text)" }}>
                    {w.email}
                  </span>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => void copyText(w.email)}>
                    Copy
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card card--elevated dash-form-stack">
          <p className="dash-section-title">Notify all (waitlist)</p>
          <p className="dash-muted">
            Send one email to every waitlist subscriber ({waitlist.length} recipient
            {waitlist.length !== 1 ? "s" : ""}).
          </p>
          <div>
            <label className="dash-label">Subject</label>
            <input
              type="text"
              className="dash-input"
              value={notifySubject}
              onChange={(e) => setNotifySubject(e.target.value)}
              placeholder="e.g. ESG Saathi launch update"
            />
          </div>
          <div>
            <label className="dash-label">Message</label>
            <textarea
              className="dash-input dash-advisor__textarea"
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              placeholder="Write your update… (Ctrl+Enter to send)"
              rows={6}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void sendWaitlistNotification();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ alignSelf: "flex-start" }}
            disabled={sendingNotify || !notifySubject.trim() || !notifyMessage.trim() || waitlist.length === 0}
            onClick={() => void sendWaitlistNotification()}
          >
            {sendingNotify ? "Sending…" : `Send to ${waitlist.length} users`}
          </button>
          {waitlist.length === 0 && (
            <p className="dash-muted" style={{ color: "#d97706" }}>
              Add waitlist subscribers before sending a broadcast.
            </p>
          )}
        </div>
      </div>

      <AdminReplyModal
        contact={replyTarget}
        onClose={() => setReplyTarget(null)}
        onSent={handleReplied}
      />
      <CompleteMeetingModal
        meeting={completeMeeting}
        submitting={submittingMeeting}
        onClose={() => setCompleteMeeting(null)}
        onSubmit={handleCompleteMeeting}
      />
    </div>
  );
}
