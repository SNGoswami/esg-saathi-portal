"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminReplyModal from "@/modules/admin/ui/AdminReplyModal";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import {
  ADMIN_CONTACT_PAGE_SIZE,
  listAdminContacts,
  listAdminWaitlist,
  sendWaitlistUpdate,
  type AdminContact,
  type AdminWaitlistEntry,
} from "@/modules/admin/api/adminApi";
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

export default function AdminDashboardView() {
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

  async function refresh() {
    await load({ skipCache: true, silent: true });
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
                : "Reply to contact form submissions and email all waitlist subscribers."}
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
    </div>
  );
}
