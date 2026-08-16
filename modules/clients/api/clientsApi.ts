import { apiFetch } from "@/modules/platform/api/client";

export type Client = {
  id: string;
  companyName: string;
  address?: string | null;
  cin?: string | null;
  gstNumber?: string | null;
  annualRevenue?: number | null;
  sector?: string | null;
  subSector?: string | null;
  companyEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateClientPayload = {
  companyName: string;
  address: string;
  cin: string;
  gstNumber: string;
  annualRevenue: number;
  sector: string;
  subSector: string;
  companyEmail: string;
};

export type ClientsPageResponse = {
  content?: Client[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  // fallback if API returns a plain array
};

function normalizePageResponse(data: ClientsPageResponse | Client[]): {
  content: Client[];
  totalPages: number;
  number: number;
  totalElements: number;
} {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalPages: 1,
      number: 0,
      totalElements: data.length,
    };
  }
  const content = data.content ?? [];
  return {
    content,
    totalPages: data.totalPages ?? 1,
    number: data.number ?? 0,
    totalElements: data.totalElements ?? content.length,
  };
}

export async function listClients(page = 0, size = 10) {
  const data = await apiFetch<ClientsPageResponse | Client[]>(
    `/api/clients?page=${page}&size=${size}`,
    { method: "GET" },
  );
  return normalizePageResponse(data);
}

export async function createClient(payload: CreateClientPayload) {
  return apiFetch<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteClient(id: string) {
  return apiFetch<void>(`/api/clients/${id}`, { method: "DELETE" });
}

export function formatRevenue(value: number | string | null | undefined) {
  if (value == null) return "-";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
