"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminReplyModal from "@/modules/admin/ui/AdminReplyModal";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import {
  ADMIN_CONTACT_PAGE_SIZE,
  listAdminContacts,
  listAdminMeetings,
  listAdminWaitlist,
  sendWaitlistUpdate,
  type AdminContact,
  type AdminWaitlistEntry,
  type DemoMeeting,
} from "@/modules/admin/api/adminApi";
import { formatClock, relativeWhen } from "@/modules/admin/ui/meetingHelpers";
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

function InboxRow({
  contact,
  expanded,
  onToggle,
  onReply,
}: {
  contact: AdminContact;
  expanded: boolean;
  onToggle: () => void;
  onReply: () => void;
}) {
  return (
    <article className={`dash-admin-inbox__item${expanded ? " is-open" : ""}${contact.replied ? "" : " is-unread"}`}>
      <button type="button" className="dash-admin-inbox__row" onClick={onToggle}>
        <span className={`dash-status-dot${contact.replied ? "" : " dash-status-dot--ready"}`} aria-hidden />
        <div className="dash-admin-inbox__main">
          <div className="dash-admin-inbox__who">
            <span className="dash-admin-inbox__name">{contact.name}</span>
            <span className="dash-admin-inbox__subject">{contact.subject}</span>
          </div>
          <p className="dash-admin-inbox__preview">{expanded ? contact.email : contact.message}</p>
          {expanded ? (
            <p className="dash-admin-inbox__body">{contact.message}</p>
          ) : null}
        </div>
        <span className="dash-admin-inbox__time">{formatContactDate(contact.createdAt)}</span>
      </button>
      <div className="dash-admin-inbox__action">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={contact.replied}
          onClick={onReply}
        >
          {contact.replied ? "Replied" : "Reply"}
        </button>
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
  const [nextDemo, setNextDemo] = useState<DemoMeeting | null>(null);

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

  const loadNextDemo = useCallback(async () => {
    try {
      const scheduled = await listAdminMeetings("SCHEDULED", 0, 1);
      const list = [...(scheduled.content ?? [])].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
      setNextDemo(list[0] ?? null);
    } catch {
      setNextDemo(null);
    }
  }, []);

  useEffect(() => {
    void loadNextDemo();
  }, [loadNextDemo]);

  async function refresh() {
    await Promise.all([load({ skipCache: true, silent: true }), loadNextDemo()]);
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

  const pendingCount = useMemo(() => contacts.filter((c) => !c.replied).length, [contacts]);

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
      <div className="card card--elevated dash-welcome-card dash-admin-home-head">
        <div>
          <p className="dash-welcome-card__eyebrow">Admin</p>
          <p className="dash-welcome-card__title">Inbox</p>
          <p className="dash-admin-kpis">
            <span>
              {loading && contacts.length === 0
                ? "Loading…"
                : refreshing
                  ? "Refreshing…"
                  : `${pendingCount} unreplied`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{waitlist.length} waitlist</span>
            {nextDemo ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Next demo {relativeWhen(nextDemo.startsAt)}</span>
              </>
            ) : null}
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

      {nextDemo ? (
        <div className="card card--elevated dash-admin-next">
          <div>
            <p className="dash-admin-next__time">{formatClock(nextDemo.startsAt)}</p>
            <p className="dash-admin-next__title">{nextDemo.title || "Product demo"}</p>
            <p className="dash-muted" style={{ marginTop: 4 }}>
              {nextDemo.userName || nextDemo.userEmail} · {relativeWhen(nextDemo.startsAt)}
            </p>
          </div>
          <div className="dash-admin-next__actions">
            {nextDemo.meetLink ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => window.open(nextDemo.meetLink ?? "", "_blank", "noopener,noreferrer")}
              >
                Join
              </button>
            ) : null}
            <button type="button" className="btn-ghost btn-sm" onClick={() => onNavigateView?.("meetings")}>
              Meetings
            </button>
          </div>
        </div>
      ) : null}

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        <div className="dash-panel-head">
          <div>
            <p className="dash-panel-head__title">Messages</p>
            <p className="dash-muted" style={{ marginTop: 2 }}>
              {loading ? "Loading…" : `${filteredContacts.length} of ${totalContacts}`}
            </p>
          </div>
        </div>
        <div className="dash-admin-inbox__search">
          <input
            type="search"
            className="dash-input"
            placeholder="Search name, email, or subject"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading && contacts.length === 0}
          />
        </div>
        {loading && contacts.length === 0 ? (
          <p className="dash-muted" style={{ padding: "1.5rem", textAlign: "center" }}>
            Loading messages…
          </p>
        ) : filteredContacts.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 160, padding: "1.75rem 1rem" }}>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              {searchTerm ? "No matching messages" : "No messages yet"}
            </p>
          </div>
        ) : (
          <div className="dash-admin-inbox">
            {filteredContacts.map((c) => (
              <InboxRow
                key={c.id}
                contact={c}
                expanded={expandedIds.has(c.id)}
                onToggle={() => toggleExpanded(c.id)}
                onReply={() => setReplyTarget(c)}
              />
            ))}
          </div>
        )}
        {(hasMore || contacts.length > ADMIN_CONTACT_PAGE_SIZE) && (
          <div className="dash-form-actions" style={{ justifyContent: "flex-end", padding: "0.625rem 1rem 0.875rem" }}>
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

      <div className="card card--elevated dash-form-stack">
        <div>
          <p className="dash-section-title">Waitlist update</p>
          <p className="dash-muted" style={{ marginTop: 4 }}>
            One email to {waitlist.length} subscriber{waitlist.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div>
          <label className="dash-label">Subject</label>
          <input
            type="text"
            className="dash-input"
            value={notifySubject}
            onChange={(e) => setNotifySubject(e.target.value)}
            placeholder="Launch update"
          />
        </div>
        <div>
          <label className="dash-label">Message</label>
          <textarea
            className="dash-input dash-advisor__textarea"
            value={notifyMessage}
            onChange={(e) => setNotifyMessage(e.target.value)}
            placeholder="Write the update…"
            rows={5}
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
          {sendingNotify ? "Sending…" : "Send"}
        </button>
      </div>

      <AdminReplyModal
        contact={replyTarget}
        onClose={() => setReplyTarget(null)}
        onSent={handleReplied}
      />
    </div>
  );
}
