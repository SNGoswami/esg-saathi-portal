"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminReplyModal from "@/modules/admin/ui/AdminReplyModal";
import { AdminEmpty, AdminPage, AdminSurface } from "@/modules/admin/ui/AdminChrome";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import {
  ADMIN_CONTACT_PAGE_SIZE,
  listAdminContacts,
  listAdminMeetings,
  listAdminWaitlist,
  listPendingAdminUsers,
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
    <article
      className={`admin-list__row${expanded ? " is-open" : ""}${contact.replied ? "" : " is-unread"}`}
    >
      <button type="button" className="admin-list__main" onClick={onToggle}>
        <span className={`dash-status-dot${contact.replied ? "" : " dash-status-dot--ready"}`} aria-hidden />
        <div>
          <div className="admin-list__who">
            <span className="admin-list__name">{contact.name}</span>
            <span className="admin-list__subject">{contact.subject}</span>
          </div>
          <p className="admin-list__preview">{expanded ? contact.email : contact.message}</p>
          {expanded ? <p className="admin-list__body">{contact.message}</p> : null}
        </div>
        <span className="admin-list__time">{formatContactDate(contact.createdAt)}</span>
      </button>
      <div className="admin-list__action">
        <button type="button" className="btn-primary btn-sm" disabled={contact.replied} onClick={onReply}>
          {contact.replied ? "Replied" : "Reply"}
        </button>
      </div>
    </article>
  );
}

function GlanceStat({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="admin-kpi__label">{label}</p>
      <p className="admin-kpi__value">{value}</p>
      {hint ? <p className="admin-kpi__hint">{hint}</p> : null}
    </>
  );

  if (!onClick) {
    return <div className="admin-kpi">{inner}</div>;
  }

  return (
    <button type="button" className="admin-kpi admin-kpi--btn" onClick={onClick}>
      {inner}
    </button>
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
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [inboxFilter, setInboxFilter] = useState<"open" | "all">("open");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const waitlistRef = useRef<HTMLDivElement>(null);

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
        const [cData, wData, pending, scheduled] = await Promise.all([
          listAdminContacts(0),
          listAdminWaitlist(),
          listPendingAdminUsers(0, 1).catch(() => null),
          listAdminMeetings("SCHEDULED", 0, 20).catch(() => null),
        ]);
        persistContactsState(cData.content, 0, !cData.last, cData.totalElements);
        applyWaitlist(wData);
        setPendingApprovals(pending?.totalElements ?? 0);
        const upcoming = [...(scheduled?.content ?? [])].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
        setNextDemo(upcoming[0] ?? null);
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

  async function refresh() {
    await load({ skipCache: true, silent: true });
    toast.success("Inbox refreshed");
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
    return contacts.filter((c) => {
      if (inboxFilter === "open" && c.replied) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q)
      );
    });
  }, [contacts, searchTerm, inboxFilter]);

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
      setWaitlistOpen(false);
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

  function focusWaitlist() {
    setWaitlistOpen(true);
    requestAnimationFrame(() => {
      waitlistRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const statusLabel =
    loading && contacts.length === 0
      ? "Loading…"
      : refreshing
        ? "Refreshing…"
        : pendingCount === 0
          ? "Inbox is clear"
          : `${pendingCount} unreplied`;

  return (
    <AdminPage
      title="Inbox"
      meta={statusLabel}
      actions={
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={refreshing || loading}
          onClick={() => void refresh()}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <div className="admin-kpis">
        <GlanceStat
          label="Unreplied"
          value={loading && contacts.length === 0 ? "…" : String(pendingCount)}
          hint={totalContacts ? `${totalContacts} total` : undefined}
          onClick={() => setInboxFilter("open")}
        />
        <GlanceStat
          label="Approvals"
          value={String(pendingApprovals)}
          hint="Awaiting review"
          onClick={() => onNavigateView?.("pending-users")}
        />
        <GlanceStat
          label="Waitlist"
          value={String(waitlist.length)}
          hint="Subscribers"
          onClick={focusWaitlist}
        />
        <GlanceStat
          label="Next demo"
          value={nextDemo ? formatClock(nextDemo.startsAt) : "—"}
          hint={nextDemo ? relativeWhen(nextDemo.startsAt) : "None scheduled"}
          onClick={() => onNavigateView?.("meetings")}
        />
      </div>

      <div className="admin-home">
        <AdminSurface>
          <div className="admin-surface__head">
            <div className="admin-filters" role="tablist" aria-label="Message status">
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === "open"}
                className={`admin-filter${inboxFilter === "open" ? " is-active" : ""}`}
                onClick={() => setInboxFilter("open")}
              >
                Unreplied
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inboxFilter === "all"}
                className={`admin-filter${inboxFilter === "all" ? " is-active" : ""}`}
                onClick={() => setInboxFilter("all")}
              >
                All
              </button>
            </div>
            <div className="admin-search">
              <i className="ti ti-search" aria-hidden="true" />
              <input
                type="search"
                className="dash-input"
                placeholder="Search name, email, or subject"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading && contacts.length === 0}
              />
            </div>
          </div>
          {loading && contacts.length === 0 ? (
            <AdminEmpty title="Loading messages…" />
          ) : filteredContacts.length === 0 ? (
            <AdminEmpty
              title={searchTerm ? "No matching messages" : inboxFilter === "open" ? "Inbox is clear" : "No messages yet"}
              hint={inboxFilter === "open" && contacts.length > 0 ? "Open All to see replied mail." : undefined}
            />
          ) : (
            <div className="admin-list">
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
            <div className="admin-footer">
              <span className="admin-quiet">
                {filteredContacts.length} shown · {totalContacts} total
              </span>
              <div className="admin-toolbar__actions">
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
            </div>
          )}
        </AdminSurface>

        <aside className="admin-home__rail">
          <AdminSurface>
            {nextDemo ? (
              <div className="admin-banner">
                <div>
                  <p className="admin-banner__time">{formatClock(nextDemo.startsAt)}</p>
                  <p className="admin-banner__title">{nextDemo.title || "Product demo"}</p>
                  <p className="admin-banner__meta">
                    {nextDemo.userName || nextDemo.userEmail} · {relativeWhen(nextDemo.startsAt)}
                  </p>
                </div>
                <div className="admin-banner__actions">
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
                    Open
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-banner">
                <div>
                  <p className="admin-banner__time">Calendar</p>
                  <p className="admin-banner__title">No demo lined up</p>
                  <p className="admin-banner__meta">Schedule from Approvals when a signup is ready.</p>
                </div>
                <div className="admin-banner__actions">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => onNavigateView?.("pending-users")}>
                    Approvals
                  </button>
                </div>
              </div>
            )}
          </AdminSurface>

          <div ref={waitlistRef}>
            <AdminSurface padded>
              <div className="admin-form">
                <div className="admin-rail-head">
                  <div>
                    <p className="admin-rail-head__title">Waitlist</p>
                    <p className="admin-quiet">
                      {waitlist.length} subscriber{waitlist.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setWaitlistOpen((open) => !open)}
                  >
                    {waitlistOpen ? "Close" : "Write update"}
                  </button>
                </div>
                {waitlistOpen ? (
                  <>
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
                      {sendingNotify ? "Sending…" : "Send update"}
                    </button>
                  </>
                ) : null}
              </div>
            </AdminSurface>
          </div>
        </aside>
      </div>

      <AdminReplyModal
        contact={replyTarget}
        onClose={() => setReplyTarget(null)}
        onSent={handleReplied}
      />
    </AdminPage>
  );
}
