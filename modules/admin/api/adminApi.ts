import { apiFetch } from "@/modules/platform/api/client";

export type AdminContact = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  replied: boolean;
  createdAt: string;
};

export type AdminWaitlistEntry = {
  id: string;
  email: string;
  createdAt: string;
};

export type AdminContactPage = {
  content: AdminContact[];
  last: boolean;
  number: number;
  totalElements: number;
};

export const ADMIN_CONTACT_PAGE_SIZE = 10;

export function listAdminContacts(page: number, size = ADMIN_CONTACT_PAGE_SIZE) {
  return apiFetch<AdminContactPage>(
    `/api/admin/contact-info?page=${page}&size=${size}`,
  );
}

export function listAdminWaitlist() {
  return apiFetch<AdminWaitlistEntry[]>("/api/admin/waitlist-info");
}

export function sendAdminContactReply(payload: {
  contactId: number;
  to: string;
  subject: string;
  message: string;
}) {
  return apiFetch<void>("/api/admin/reply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendWaitlistUpdate(payload: { subject: string; message: string }) {
  return apiFetch<{ count?: number }>("/api/admin/send-waitlist-update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AdminUserRole =
  | "MSME"
  | "CA"
  | "CS"
  | "ESG_CONSULTANT"
  | "ASSURER_AUDITOR";

export type AdminUserListItem = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: AdminUserRole;
  sector: string | null;
  subSector: string | null;
  icaiMemberNumber: string | null;
  icsiMemberNumber: string | null;
  consultantId: string | null;
  frmId: string | null;
  organizationName: string | null;
  expertiseArea: string | null;
  accreditationNo: string | null;
  active: boolean;
  accountStatus?: "PENDING" | "ACTIVE" | "REJECTED";
  createdAt: string;
};

export type AdminUserColumn = {
  key: string;
  label: string;
  getValue: (user: AdminUserListItem) => string | null | undefined;
};

export const ADMIN_USER_COLUMNS: Record<AdminUserRole, AdminUserColumn[]> = {
  MSME: [
    { key: "sector", label: "Sector", getValue: (u) => u.sector },
    { key: "subSector", label: "Sub-sector", getValue: (u) => u.subSector },
  ],
  CA: [
    { key: "icai", label: "ICAI member no.", getValue: (u) => u.icaiMemberNumber },
  ],
  CS: [
    { key: "icsi", label: "ICSI member no.", getValue: (u) => u.icsiMemberNumber },
  ],
  ESG_CONSULTANT: [
    { key: "consultantId", label: "Consultant ID", getValue: (u) => u.consultantId },
    { key: "organization", label: "Organization", getValue: (u) => u.organizationName },
    { key: "expertise", label: "Expertise", getValue: (u) => u.expertiseArea },
  ],
  ASSURER_AUDITOR: [
    { key: "accreditation", label: "Accreditation no.", getValue: (u) => u.accreditationNo },
    { key: "organization", label: "Organization", getValue: (u) => u.organizationName },
  ],
};

export type AdminUserPage = {
  content: AdminUserListItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type AdminUserAnalytics = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersLast10Days: number;
  usersByRole: Record<string, number>;
};

export const ADMIN_USER_PAGE_SIZE = 20;

/** Dashboard admin nav view slug → API role */
export const ADMIN_VIEW_TO_ROLE: Record<string, AdminUserRole> = {
  msmes: "MSME",
  cas: "CA",
  css: "CS",
  esgs: "ESG_CONSULTANT",
  auditors: "ASSURER_AUDITOR",
};

export const ADMIN_ROLE_LABELS: Record<AdminUserRole, string> = {
  MSME: "MSME",
  CA: "Chartered Accountant",
  CS: "Company Secretary",
  ESG_CONSULTANT: "ESG Consultant",
  ASSURER_AUDITOR: "Assurer / Auditor",
};

export function getAdminAnalytics() {
  return apiFetch<AdminUserAnalytics>("/api/admin/users/analytics");
}

export function listAdminUsers(role: AdminUserRole, page: number, size = ADMIN_USER_PAGE_SIZE) {
  return apiFetch<AdminUserPage>(
    `/api/admin/users?role=${encodeURIComponent(role)}&page=${page}&size=${size}`,
  );
}

export function listPendingAdminUsers(page: number, size = ADMIN_USER_PAGE_SIZE) {
  return apiFetch<AdminUserPage>(
    `/api/admin/users/pending?page=${page}&size=${size}`,
  );
}

export function approveAdminUser(userId: string) {
  return apiFetch<{ message: string }>(`/api/admin/users/${encodeURIComponent(userId)}/approve`, {
    method: "POST",
  });
}

export function rejectAdminUser(userId: string) {
  return apiFetch<{ message: string }>(`/api/admin/users/${encodeURIComponent(userId)}/reject`, {
    method: "POST",
  });
}

export type DemoMeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type MeetingDecision = "DEFER" | "APPROVE" | "REJECT";

export type DemoMeeting = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userRole: AdminUserRole | string | null;
  accountStatus: "PENDING" | "ACTIVE" | "REJECTED" | null;
  scheduledBy: string;
  title: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  status: DemoMeetingStatus;
  googleEventId: string | null;
  calendarHtmlLink: string | null;
  meetLink: string | null;
  googleSynced: boolean;
  conclusion: string | null;
  decision: MeetingDecision | null;
  createdAt: string;
};

export type DemoMeetingPage = {
  content: DemoMeeting[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
};

export type ScheduleMeetingPayload = {
  userId: string;
  startsAt: string;
  durationMinutes: number;
  title?: string;
  notes?: string;
};

export function getGoogleCalendarStatus() {
  return apiFetch<GoogleCalendarStatus>("/api/admin/google/status");
}

export function getGoogleCalendarConnectUrl() {
  return apiFetch<{ url: string }>("/api/admin/google/connect");
}

export function disconnectGoogleCalendar() {
  return apiFetch<{ message: string }>("/api/admin/google/disconnect", { method: "DELETE" });
}

export function listAdminMeetings(status: DemoMeetingStatus | "ALL", page: number, size = ADMIN_USER_PAGE_SIZE) {
  const q = status === "ALL" ? "" : `status=${encodeURIComponent(status)}&`;
  return apiFetch<DemoMeetingPage>(`/api/admin/meetings?${q}page=${page}&size=${size}`);
}

export function scheduleAdminMeeting(payload: ScheduleMeetingPayload) {
  return apiFetch<DemoMeeting>("/api/admin/meetings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function rescheduleAdminMeeting(meetingId: string, payload: ScheduleMeetingPayload) {
  return apiFetch<DemoMeeting>(`/api/admin/meetings/${encodeURIComponent(meetingId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function cancelAdminMeeting(meetingId: string) {
  return apiFetch<DemoMeeting>(`/api/admin/meetings/${encodeURIComponent(meetingId)}/cancel`, {
    method: "POST",
  });
}

export function completeAdminMeeting(
  meetingId: string,
  payload: { conclusion: string; decision: MeetingDecision },
) {
  return apiFetch<DemoMeeting>(`/api/admin/meetings/${encodeURIComponent(meetingId)}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
