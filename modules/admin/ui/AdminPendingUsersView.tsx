"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_ROLE_LABELS,
  approveAdminUser,
  listPendingAdminUsers,
  rejectAdminUser,
  type AdminUserListItem,
  type AdminUserRole,
} from "@/modules/admin/api/adminApi";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";

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

  useToastOnValue(error, "error");

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
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = [u.name, u.email, u.role, roleLabel(u.role)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [users, search]);

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
          · Approve to grant portal access · Reject to block login
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
                    <td data-label="Joined">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "-"}
                    </td>
                    <td data-label="Actions">
                      <div className="dash-form-actions" style={{ margin: 0 }}>
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
    </div>
  );
}
