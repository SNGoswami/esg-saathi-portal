"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_ROLE_LABELS,
  ADMIN_USER_COLUMNS,
  ADMIN_VIEW_TO_ROLE,
  adminUserColumnSummary,
  listAdminUsers,
  type AdminUserListItem,
  type AdminUserRole,
} from "@/modules/admin/api/adminApi";
import { readAdminUsersCache, writeAdminUsersCache } from "@/modules/admin/api/adminUsersCache";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";

type AdminUsersViewProps = {
  view: string;
};

function displayValue(value: string | null | undefined) {
  const v = value?.trim();
  return v || "-";
}

function readInitialCache(role: AdminUserRole) {
  return typeof window !== "undefined" ? readAdminUsersCache(role, 0) : null;
}

export default function AdminUsersView({ view }: AdminUsersViewProps) {
  const role = ADMIN_VIEW_TO_ROLE[view] as AdminUserRole | undefined;
  const roleLabel = role ? ADMIN_ROLE_LABELS[role] : "Users";
  const roleColumns = useMemo(
    () => (role ? ADMIN_USER_COLUMNS[role] : []),
    [role],
  );

  const [users, setUsers] = useState<AdminUserListItem[]>(() => {
    if (!role) return [];
    return readInitialCache(role)?.users ?? [];
  });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(() => {
    if (!role) return 1;
    return readInitialCache(role)?.totalPages ?? 1;
  });
  const [totalElements, setTotalElements] = useState(() => {
    if (!role) return 0;
    return readInitialCache(role)?.totalElements ?? 0;
  });
  const [loading, setLoading] = useState(() => {
    if (!role) return false;
    return readInitialCache(role) === null;
  });
  const [error, setError] = useState("");

  useToastOnValue(error, "error");
  useToastOnValue(!role ? "Unknown user list." : null, "error");
  const [search, setSearch] = useState("");

  const applyPageData = useCallback(
    (targetPage: number, content: AdminUserListItem[], tp: number, total: number) => {
      if (!role) return;
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
      if (!role) return;

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
        applyPageData(
          targetPage,
          res.content,
          Math.max(1, res.totalPages),
          res.totalElements,
        );
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
    if (!role) {
      setLoading(false);
      return;
    }

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
      const base =
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      if (base) return true;
      return roleColumns.some((col) =>
        (col.getValue(u) ?? "").toLowerCase().includes(q),
      );
    });
  }, [users, search, roleColumns]);

  if (!role) {
    return <div className="dash-content" />;
  }

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card">
        <p className="dash-welcome-card__eyebrow">Users</p>
        <p className="dash-welcome-card__title">{roleLabel}</p>
        <p className="dash-muted" style={{ marginTop: 6 }}>
          {loading && users.length === 0
            ? "Loading…"
            : loading
              ? "Updating…"
              : `${totalElements} registered`}{" "}
          · Name · {adminUserColumnSummary(role)}
        </p>
      </div>

      <div className="card card--elevated" style={{ padding: "0.75rem 1rem" }}>
        <input
          type="search"
          className="dash-input"
          placeholder={`Search name, email, ${roleColumns.map((c) => c.label.toLowerCase()).join(", ")}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p className="dash-muted" style={{ padding: "1.5rem", textAlign: "center" }}>
            Loading {roleLabel}…
          </p>
        ) : filtered.length === 0 ? (
          <div className="dash-empty" style={{ minHeight: 200 }}>
            <p className="dash-section-title" style={{ fontSize: "0.8125rem" }}>
              {search ? "No users match your search" : "No users found"}
            </p>
          </div>
        ) : (
          <div className="dash-data-table-wrap">
            <table className="dash-data-table">
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
                    <td className="dash-data-table__primary" data-label="Name">
                      {u.name}
                      <span className="dash-muted" style={{ display: "block", fontSize: "0.625rem", fontWeight: 400 }}>
                        {u.email}
                      </span>
                    </td>
                    {roleColumns.map((col) => (
                      <td key={col.key} data-label={col.label}>
                        {displayValue(col.getValue(u))}
                      </td>
                    ))}
                    <td data-label="Status">
                      <span
                        className={
                          u.active ? "dash-chip dash-chip--success" : "dash-chip dash-chip--warning"
                        }
                      >
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td data-label="Joined">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "-"}
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
