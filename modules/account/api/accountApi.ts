import { apiFetch } from "@/modules/platform/api/client";

export type AccountSettings = {
  id: string;
  email: string;
  phoneNo: string | null;
  firstName: string;
  lastName: string;
  hasPassword: boolean;
};

export type AuthMessageResponse = {
  message?: string;
  email?: string;
  token?: string;
};

export async function getAccountSettings() {
  return apiFetch<AccountSettings>("/api/account", { method: "GET" });
}

export async function updatePhone(phoneNo: string) {
  return apiFetch<AccountSettings>("/api/account/phone", {
    method: "PATCH",
    body: JSON.stringify({ phoneNo }),
  });
}

export async function sendEmailChangeOtp(newEmail: string) {
  return apiFetch<AuthMessageResponse>("/api/account/email/send-otp", {
    method: "POST",
    body: JSON.stringify({ newEmail }),
  });
}

export async function verifyEmailChange(newEmail: string, otp: string) {
  return apiFetch<AuthMessageResponse>("/api/account/email/verify", {
    method: "POST",
    body: JSON.stringify({ newEmail, otp }),
  });
}

export async function sendPasswordChangeOtp() {
  return apiFetch<AuthMessageResponse>("/api/account/password/send-otp", {
    method: "POST",
  });
}

export async function changePassword(otp: string, newPassword: string) {
  return apiFetch<AuthMessageResponse>("/api/account/password/change", {
    method: "POST",
    body: JSON.stringify({ otp, newPassword }),
  });
}
