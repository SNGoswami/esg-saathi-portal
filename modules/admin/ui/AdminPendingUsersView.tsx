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

function displayValue(value: string | null | undefined) {
  const v = value?.trim();
  return v || "-";
}

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
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card">
        <p className="dash-welcome-card__eyebrow">Users</p>
        <p className="dash-welcome-card__title">Pending approval</p>
        <p className="dash-muted" style={{ marginTop: 6 }}>
          {loading && users.length === 0
            ? "Loading…"
            : loading
              ? "Updating…"
              : `${totalElements} awaiting review`}{" "}
          · Schedule a demo, then approve or reject from the meeting conclusion
        </p>
      </div>

      <div className="card card--elevated" style={{ padding: "0.75rem 1rem" }}>
        <input
          type="search"
          className="dash-input"
          placeholder="Search name, email, role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        {loading && users.length === 0 ? (
          <p className="dash-muted" style={{ padding: "1.5rem", textAlign: "center" }}>
            Loading pending users…
          </p>
        ) : filtered.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 200 }}>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              {search ? "No users match your search" : "No pending users"}
            </p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Demo</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="dash-data-table__primary" data-label="Name">
                      {u.name}
                      <span className="dash-muted" style={{ display: "block", fontSize: "0.625rem", fontWeight: 400 }}>
                        {u.email}
                      </span>
                    </td>
                    <td data-label="Role">{displayValue(roleLabel(u.role))}</td>
                    <td data-label="Status">
                      <span className="dash-chip dash-chip--warning">Pending</span>
                    </td>
                    <td data-label="Demo">
                      {meetingByUser.get(u.id)
                        ? new Date(meetingByUser.get(u.id)!.startsAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td data-label="Joined">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "-"}
                    </td>
                    <td data-label="Actions">
                      <div className="dash-form-actions" style={{ margin: 0 }}>
                        {meetingByUser.get(u.id) ? (
                          <>
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              disabled={actingId === u.id || loading}
                              onClick={() => {
                                setRescheduleMeeting(meetingByUser.get(u.id)!);
                                setScheduleUser(u);
                              }}
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              disabled={actingId === u.id || loading}
                              onClick={() => setCompleteMeeting(meetingByUser.get(u.id)!)}
                            >
                              Conclude
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            disabled={actingId === u.id || loading}
                            onClick={() => setScheduleUser(u)}
                          >
                            Schedule demo
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          disabled={actingId === u.id || loading}
                          onClick={() => void decide(u, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          disabled={actingId === u.id || loading}
                          onClick={() => void decide(u, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div
            className="dash-form-actions"
            style={{
              justifyContent: "space-between",
              padding: "0.625rem 0.75rem",
              borderTop: "0.5px solid var(--color-border)",
            }}
          >
            <span className="dash-muted">
              Page {page + 1} of {totalPages}
            </span>
            <div className="dash-form-actions" style={{ margin: 0 }}>
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
        )}
      </div>

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
    </div>
  );
}
