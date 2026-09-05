"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_ROLE_LABELS,
  ADMIN_USER_COLUMNS,
  ADMIN_VIEW_TO_ROLE,
  listAdminUsers,
  type AdminUserListItem,
  type AdminUserRole,
} from "@/modules/admin/api/adminApi";
import { readAdminUsersCache, writeAdminUsersCache } from "@/modules/admin/api/adminUsersCache";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { AdminEmpty, AdminPage, AdminSegmented, AdminSurface } from "@/modules/admin/ui/AdminChrome";

const ROLE_TABS: { view: string; role: AdminUserRole; label: string }[] = [
  { view: "msmes", role: "MSME", label: "MSME" },
  { view: "cas", role: "CA", label: "CA" },
  { view: "css", role: "CS", label: "CS" },
  { view: "esgs", role: "ESG_CONSULTANT", label: "ESG" },
  { view: "auditors", role: "ASSURER_AUDITOR", label: "Auditors" },
];

type AdminUsersViewProps = {
  view: string;
  onNavigateView?: (view: string) => void;
};

function displayValue(value: string | null | undefined) {
  const v = value?.trim();
  return v || "—";
}

function roleFromView(view: string): AdminUserRole {
  return ADMIN_VIEW_TO_ROLE[view] ?? "MSME";
}

function readInitialCache(role: AdminUserRole) {
  return typeof window !== "undefined" ? readAdminUsersCache(role, 0) : null;
}

export default function AdminUsersView({ view, onNavigateView }: AdminUsersViewProps) {
  const role = roleFromView(view);
  const roleLabel = ADMIN_ROLE_LABELS[role];
  const roleColumns = useMemo(() => ADMIN_USER_COLUMNS[role], [role]);

  const [users, setUsers] = useState<AdminUserListItem[]>(() => readInitialCache(role)?.users ?? []);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(() => readInitialCache(role)?.totalPages ?? 1);
  const [totalElements, setTotalElements] = useState(() => readInitialCache(role)?.totalElements ?? 0);
  const [loading, setLoading] = useState(() => readInitialCache(role) === null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useToastOnValue(error, "error");

  const applyPageData = useCallback(
    (targetPage: number, content: AdminUserListItem[], tp: number, total: number) => {
      setUsers(content);
      setPage(targetPage);
      setTotalPages(tp);
      setTotalElements(total);
      writeAdminUsersCache(role, targetPage, {
        users: content,
        totalPages: tp,
        totalElements: total,
      });
    },
    [role],
  );

  const load = useCallback(
    async (targetPage: number, options?: { skipCache?: boolean; silent?: boolean }) => {
      if (!options?.skipCache) {
        const cached = readAdminUsersCache(role, targetPage);
        if (cached) {
          applyPageData(targetPage, cached.users, cached.totalPages, cached.totalElements);
          if (!options?.silent) {
            setLoading(false);
            setError("");
          }
          return;
        }
      }

      if (!options?.silent) {
        setLoading(true);
        setUsers([]);
        setError("");
      }

      try {
        const res = await listAdminUsers(role, targetPage);
        applyPageData(targetPage, res.content, Math.max(1, res.totalPages), res.totalElements);
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load users");
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [role, applyPageData],
  );

  useEffect(() => {
    setSearch("");
    const cached = readAdminUsersCache(role, 0);
    if (cached) {
      applyPageData(0, cached.users, cached.totalPages, cached.totalElements);
      setLoading(false);
      setError("");
      void load(0, { skipCache: true, silent: true });
      return;
    }
    void load(0);
  }, [role, applyPageData, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const base = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      if (base) return true;
      return roleColumns.some((col) => (col.getValue(u) ?? "").toLowerCase().includes(q));
    });
  }, [users, search, roleColumns]);

  const activeTab = ROLE_TABS.find((tab) => tab.role === role)?.view ?? "msmes";

  return (
    <AdminPage
      title="Users"
      meta={
        loading && users.length === 0 ? "Loading…" : `${totalElements.toLocaleString()} registered`
      }
      actions={
        <AdminSegmented
          ariaLabel="User role"
          value={activeTab}
          onChange={(next) => onNavigateView?.(next)}
          options={ROLE_TABS.map((tab) => ({ id: tab.view, label: tab.label }))}
        />
      }
    >
      <AdminSurface>
        <div className="admin-surface__head">
          <div className="admin-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              type="search"
              className="dash-input"
              placeholder="Search name, email, or details"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {loading ? (
          <AdminEmpty title={`Loading ${roleLabel}…`} />
        ) : filtered.length === 0 ? (
          <AdminEmpty title={search ? "No users match your search" : "No users found"} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {roleColumns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-table__primary" data-label="Name">
                      {u.name}
                      <span className="admin-table__sub">{u.email}</span>
                    </td>
                    {roleColumns.map((col) => (
                      <td key={col.key} data-label={col.label}>
                        {displayValue(col.getValue(u))}
                      </td>
                    ))}
                    <td data-label="Status">
                      <span className={u.active ? "dash-chip dash-chip--success" : "dash-chip dash-chip--warning"}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td data-label="Joined">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </AdminPage>
  );
}
