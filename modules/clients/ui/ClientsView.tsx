"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createClient,
  deleteClient,
  formatRevenue,
  listClients,
  type Client,
  type CreateClientPayload,
} from "@/modules/clients/api/clientsApi";
import { INDUSTRIES, INDUSTRY_SECTORS } from "@/modules/auth-ui/constants/industries";
import { invalidateAssessmentsCache } from "@/modules/brsr/api/assessmentsCache";
import { DataTable, SortableHeader } from "@/modules/dashboard/components/DataTable";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";

const PAGE_SIZE = 10;
const CACHE_PREFIX = "clients_list_";
const GST_RE = /^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

type ClientsCacheEntry = {
  clients: Client[];
  totalPages: number;
  totalElements: number;
};

function clientsCacheKey(page: number) {
  return `${CACHE_PREFIX}${page}_${PAGE_SIZE}`;
}

function readClientsCache(page: number): ClientsCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(clientsCacheKey(page));
    return raw ? (JSON.parse(raw) as ClientsCacheEntry) : null;
  } catch {
    return null;
  }
}

function writeClientsCache(page: number, data: ClientsCacheEntry) {
  try {
    sessionStorage.setItem(clientsCacheKey(page), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

function invalidateClientsCache() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

const emptyForm: CreateClientPayload = {
  companyName: "",
  address: "",
  cin: "",
  gstNumber: "",
  annualRevenue: 0,
  sector: "",
  subSector: "",
  companyEmail: "",
};

export default function ClientsView() {
  const confirm = useConfirm();
  const initialCache = typeof window !== "undefined" ? readClientsCache(0) : null;
  const [clients, setClients] = useState<Client[]>(initialCache?.clients ?? []);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(initialCache?.totalPages ?? 1);
  const [totalElements, setTotalElements] = useState(initialCache?.totalElements ?? 0);
  const [loading, setLoading] = useState(initialCache === null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useToastOnValue(error, "error");
  useToastOnValue(success, "success");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateClientPayload>({ ...emptyForm });
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const subsectors = useMemo(
    () => (form.sector ? INDUSTRY_SECTORS[form.sector] ?? [] : []),
    [form.sector],
  );

  const applyPageData = useCallback((targetPage: number, res: Awaited<ReturnType<typeof listClients>>) => {
    const tp = Math.max(1, res.totalPages);
    setClients(res.content);
    setTotalPages(tp);
    setTotalElements(res.totalElements);
    writeClientsCache(targetPage, {
      clients: res.content,
      totalPages: tp,
      totalElements: res.totalElements,
    });
  }, []);

  const load = useCallback(async (options?: { skipCache?: boolean }) => {
    if (!options?.skipCache) {
      const cached = readClientsCache(page);
      if (cached) {
        setClients(cached.clients);
        setTotalPages(cached.totalPages);
        setTotalElements(cached.totalElements);
        setLoading(false);
        setError("");
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const res = await listClients(page, PAGE_SIZE);
      applyPageData(page, res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [page, applyPageData]);

  useEffect(() => {
    load();
  }, [load]);

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!form.address.trim()) e.address = "Required";
    if (!form.cin.trim()) e.cin = "Required";
    if (!form.gstNumber.trim()) e.gstNumber = "Required";
    else if (!GST_RE.test(form.gstNumber.trim())) e.gstNumber = "Invalid GST format";
    if (!form.sector) e.sector = "Required";
    if (!form.subSector) e.subSector = "Required";
    if (!form.companyEmail.trim()) e.companyEmail = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)) e.companyEmail = "Invalid email";
    if (!form.annualRevenue || form.annualRevenue <= 0) e.annualRevenue = "Enter a valid amount";
    setFormErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    const ok = await confirm({
      title: "Add client?",
      description: (
        <>
          Create a new client record for <strong>{form.companyName.trim()}</strong>. You can link
          assessments and reports to this client afterward.
        </>
      ),
      confirmLabel: "Add client",
    });
    if (!ok) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createClient({
        ...form,
        companyName: form.companyName.trim(),
        address: form.address.trim(),
        cin: form.cin.trim(),
        gstNumber: form.gstNumber.trim(),
        companyEmail: form.companyEmail.trim(),
        annualRevenue: Number(form.annualRevenue),
      });
      setSuccess("Client added successfully.");
      setForm({ ...emptyForm });
      setShowForm(false);
      invalidateClientsCache();
      invalidateAssessmentsCache();
      setPage(0);
      const res = await listClients(0, PAGE_SIZE);
      applyPageData(0, res);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: `Remove client "${name}"?`,
      description: "This cannot be undone. Reports and assessments linked to this client may no longer be available.",
      confirmLabel: "Remove client",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      await deleteClient(id);
      setSuccess("Client removed.");
      invalidateClientsCache();
      invalidateAssessmentsCache();
      if (clients.length === 1 && page > 0) setPage((p) => p - 1);
      else await load({ skipCache: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnDef<Client>[] = [
      {
        accessorKey: "companyName",
        header: ({ column }) => <SortableHeader column={column} label="Company" />,
        cell: ({ row }) => (
          <span className="dash-data-table__primary">{row.original.companyName}</span>
        ),
        meta: { mobileLabel: "Company" },
      },
      {
        id: "sector",
        accessorFn: (row) => `${row.sector ?? ""} ${row.subSector ?? ""}`.trim(),
        header: ({ column }) => <SortableHeader column={column} label="Sector" />,
        cell: ({ row }) => (
          <>
            {row.original.sector}
            {row.original.subSector ? ` · ${row.original.subSector}` : ""}
          </>
        ),
        meta: { mobileLabel: "Sector" },
      },
      {
        accessorKey: "annualRevenue",
        header: ({ column }) => <SortableHeader column={column} label="Revenue" />,
        cell: ({ getValue }) => formatRevenue(getValue<number | null | undefined>()),
        meta: { mobileLabel: "Revenue" },
      },
      {
        accessorKey: "companyEmail",
        header: ({ column }) => <SortableHeader column={column} label="Email" />,
        cell: ({ getValue }) => getValue<string | null | undefined>() ?? "-",
        meta: { mobileLabel: "Email" },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleDelete(row.original.id, row.original.companyName)}
            disabled={deletingId === row.original.id}
            aria-label={`Delete ${row.original.companyName}`}
            style={{
              padding: "6px 10px",
              fontSize: 11,
              borderRadius: 8,
              border: "0.5px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.06)",
              color: "#dc2626",
              cursor: deletingId === row.original.id ? "wait" : "pointer",
              width: "100%",
            }}
          >
            {deletingId === row.original.id ? "…" : "Delete"}
          </button>
        ),
        meta: { mobileLabel: "" },
      },
  ];

  return (
    <div className="dash-content">
      <div className="card card--elevated" style={{ padding: "14px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Your clients</p>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
            {totalElements} client{totalElements !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
          onClick={() => { setShowForm((v) => !v); setFormErr({}); setError(""); }}
        >
          <i className="ti ti-plus" style={{ marginRight: 6, fontSize: 14 }} aria-hidden="true" />
          {showForm ? "Cancel" : "Add client"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card card--elevated" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>New client</p>

          <div className="clients-form-grid">
            <Field label="Company name *" value={form.companyName} error={formErr.companyName}
              onChange={(v) => setForm((f) => ({ ...f, companyName: v }))} />
            <Field label="Company email *" value={form.companyEmail} error={formErr.companyEmail} type="email"
              onChange={(v) => setForm((f) => ({ ...f, companyEmail: v }))} />
          </div>

          <Field label="Address *" value={form.address} error={formErr.address}
            onChange={(v) => setForm((f) => ({ ...f, address: v }))} />

          <div className="clients-form-grid">
            <Field label="CIN *" value={form.cin} error={formErr.cin}
              onChange={(v) => setForm((f) => ({ ...f, cin: v }))} />
            <Field label="GST number *" value={form.gstNumber} error={formErr.gstNumber}
              onChange={(v) => setForm((f) => ({ ...f, gstNumber: v.toUpperCase() }))} />
          </div>

          <div className="clients-form-grid">
            <SelectField label="Sector *" value={form.sector} error={formErr.sector}
              placeholder="Select sector"
              options={INDUSTRIES.map((s) => ({ value: s, label: s }))}
              onChange={(v) => setForm((f) => ({ ...f, sector: v, subSector: "" }))} />
            <SelectField label="Sub-sector *" value={form.subSector} error={formErr.subSector}
              disabled={!form.sector}
              placeholder={form.sector ? "Select sub-sector" : "Select sector first"}
              options={subsectors.map((s) => ({ value: s, label: s }))}
              onChange={(v) => setForm((f) => ({ ...f, subSector: v }))} />
          </div>

          <Field label="Annual revenue (₹) *" value={form.annualRevenue ? String(form.annualRevenue) : ""} error={formErr.annualRevenue}
            type="number"
            onChange={(v) => setForm((f) => ({ ...f, annualRevenue: v ? Number(v) : 0 }))} />

          <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: "flex-start", padding: "10px 18px" }}>
            {saving ? "Saving…" : "Save client"}
          </button>
        </form>
      )}

      <div className="card card--elevated" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>Loading clients…</p>
        ) : clients.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 12px", borderRadius: 12, background: "var(--brand-tint-08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-users-group" style={{ fontSize: 22, color: "var(--color-primary)" }} aria-hidden="true" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>No clients yet</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>Add your first MSME client to get started.</p>
          </div>
        ) : (
          <>
            <DataTable
              data={clients}
              columns={columns}
              getRowId={(row) => row.id}
              searchPlaceholder="Search clients on this page…"
              emptyMessage="No clients match your search."
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderTop: "0.5px solid var(--color-border)" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                Page {page + 1} of {totalPages}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .clients-form-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .clients-form-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 13,
          borderRadius: 10,
          border: `0.5px solid ${error ? "#ef4444" : "var(--color-border)"}`,
          background: "var(--color-surface)",
          color: "var(--color-text)",
          outline: "none",
        }}
      />
      {error && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 13,
          borderRadius: 10,
          border: `0.5px solid ${error ? "#ef4444" : "var(--color-border)"}`,
          background: "var(--color-surface)",
          color: "var(--color-text)",
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</p>}
    </div>
  );
}
