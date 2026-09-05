"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_ROLE_LABELS,
  approveAdminUser,
  completeAdminMeeting,
  listAdminMeetings,
  listPendingAdminUsers,
  rejectAdminUser,
  rescheduleAdminMeeting,
  scheduleAdminMeeting,
  type AdminUserListItem,
  type AdminUserRole,
  type DemoMeeting,
  type MeetingDecision,
} from "@/modules/admin/api/adminApi";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import ScheduleMeetingModal from "@/modules/admin/ui/ScheduleMeetingModal";
import CompleteMeetingModal from "@/modules/admin/ui/CompleteMeetingModal";
import {
  AdminEmpty,
  AdminMenu,
  AdminPage,
  AdminSurface,
  initialsFromName,
} from "@/modules/admin/ui/AdminChrome";
import { relativeWhen } from "@/modules/admin/ui/meetingHelpers";

function roleLabel(role: AdminUserRole | string) {
  return ADMIN_ROLE_LABELS[role as AdminUserRole] ?? role;
}

export default function AdminPendingUsersView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scheduled, setScheduled] = useState<DemoMeeting[]>([]);
  const [scheduleUser, setScheduleUser] = useState<AdminUserListItem | null>(null);
  const [rescheduleMeeting, setRescheduleMeeting] = useState<DemoMeeting | null>(null);
  const [completeMeeting, setCompleteMeeting] = useState<DemoMeeting | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useToastOnValue(error, "error");

  const loadMeetings = useCallback(async () => {
    try {
      const result = await listAdminMeetings("SCHEDULED", 0, 100);
      setScheduled(result.content ?? []);
    } catch {
      setScheduled([]);
    }
  }, []);

  const load = useCallback(async (targetPage: number, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    try {
      const result = await listPendingAdminUsers(targetPage);
      setUsers(result.content ?? []);
      setPage(result.number ?? targetPage);
      setTotalPages(Math.max(result.totalPages ?? 1, 1));
      setTotalElements(result.totalElements ?? 0);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to load pending users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
    void loadMeetings();
  }, [load, loadMeetings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = [u.name, u.email, u.role, roleLabel(u.role)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [users, search]);

  const meetingByUser = useMemo(() => {
    const map = new Map<string, DemoMeeting>();
    for (const m of scheduled) map.set(m.userId, m);
    return map;
  }, [scheduled]);

  async function handleSchedule(payload: Parameters<typeof scheduleAdminMeeting>[0]) {
    setSubmitting(true);
    setError("");
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
      await loadMeetings();
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(payload: { conclusion: string; decision: MeetingDecision }) {
    if (!completeMeeting) return;
    setSubmitting(true);
    setError("");
    try {
      await completeAdminMeeting(completeMeeting.id, payload);
      toast.show(
        payload.decision === "APPROVE"
          ? "Demo recorded and account approved"
          : payload.decision === "REJECT"
            ? "Demo recorded and account rejected"
            : "Demo conclusion saved",
        "success",
      );
      setCompleteMeeting(null);
      await loadMeetings();
      await load(page, { silent: true });
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Failed to record conclusion");
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(user: AdminUserListItem, action: "approve" | "reject") {
    const isApprove = action === "approve";
    const ok = await confirm({
      title: isApprove ? `Approve ${user.name}?` : `Reject ${user.name}?`,
      description: isApprove
        ? `${user.email} will be able to log in to the portal. We will email them when access is ready.`
        : `${user.email} will not be able to log in. They will see that their application was not approved.`,
      confirmLabel: isApprove ? "Approve" : "Reject",
      destructive: !isApprove,
    });
    if (!ok) return;

    setActingId(user.id);
    setError("");
    try {
      if (isApprove) {
        await approveAdminUser(user.id);
        toast.show(`${user.name} approved`, "success");
      } else {
        await rejectAdminUser(user.id);
        toast.show(`${user.name} rejected`, "success");
      }
      const nextPage = users.length <= 1 && page > 0 ? page - 1 : page;
      await load(nextPage, { silent: true });
      await loadMeetings();
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : `Failed to ${action} user`);
    } finally {
      setActingId(null);
    }
  }

  return (
    <AdminPage
      title="Approvals"
      meta={
        loading && users.length === 0
          ? "Loading…"
          : `${totalElements} awaiting review`
      }
    >
      <AdminSurface>
        <div className="admin-surface__head">
          <div className="admin-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="search"
              className="dash-input"
              placeholder="Search name, email, role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {loading && users.length === 0 ? (
          <AdminEmpty title="Loading pending users…" />
        ) : filtered.length === 0 ? (
          <AdminEmpty title={search ? "No users match your search" : "No pending users"} />
        ) : (
          <div>
            {filtered.map((u) => {
              const meeting = meetingByUser.get(u.id);
              const busy = actingId === u.id || loading;
              return (
                <article key={u.id} className="admin-person">
                  <span className="admin-avatar" aria-hidden="true">
                    {initialsFromName(u.name)}
                  </span>
                  <div>
                    <p className="admin-person__name">{u.name}</p>
                    <p className="admin-person__meta">
                      {u.email} · {roleLabel(u.role)}
                    </p>
                  </div>
                  <div className="admin-person__side">
                    <span className={`admin-chip${meeting ? " admin-chip--ready" : ""}`}>
                      {meeting ? relativeWhen(meeting.startsAt) : "No demo"}
                    </span>
                    {meeting ? (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => setCompleteMeeting(meeting)}
                      >
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => setScheduleUser(u)}
                      >
                        Schedule
                      </button>
                    )}
                    <AdminMenu
                      disabled={busy}
                      items={[
                        ...(meeting
                          ? [
                              {
                                id: "reschedule",
                                label: "Change time",
                                onClick: () => {
                                  setRescheduleMeeting(meeting);
                                  setScheduleUser(u);
                                },
                              },
                            ]
                          : []),
                        {
                          id: "approve",
                          label: "Approve",
                          onClick: () => void decide(u, "approve"),
                        },
                        {
                          id: "reject",
                          label: "Reject",
                          danger: true,
                          onClick: () => void decide(u, "reject"),
                        },
                      ]}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && users.length > 0 && totalPages > 1 ? (
          <div className="admin-footer">
            <span className="admin-quiet">
              Page {page + 1} of {totalPages}
            </span>
            <div className="admin-toolbar__actions">
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
        ) : null}
      </AdminSurface>

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
    </AdminPage>
  );
}
