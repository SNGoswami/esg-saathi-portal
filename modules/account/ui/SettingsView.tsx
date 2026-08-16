"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import OtpInput from "@/modules/auth-ui/components/shared/OtpInput";
import { validateEmail, validatePassword } from "@/modules/auth-ui/components/shared/api";
import {
  changePassword,
  getAccountSettings,
  sendEmailChangeOtp,
  sendPasswordChangeOtp,
  updatePhone,
  verifyEmailChange,
  type AccountSettings,
} from "@/modules/account/api/accountApi";
import {
  readAccountSettingsCache,
  writeAccountSettingsCache,
} from "@/modules/account/api/accountSettingsCache";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";

type Tab = "profile" | "password";

const PHONE_RE = /^[6-9][0-9]{9}$/;

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`dash-tab ${active ? "dash-tab--active" : ""}`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="dash-label">{children}</label>;
}

export default function SettingsView() {
  const { user, refreshUser } = useAuth();
  const confirm = useConfirm();
  const userId = user?.id ?? "";

  const [tab, setTab] = useState<Tab>("profile");
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useToastOnValue(error, "error");
  useToastOnValue(success, "success");

  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState<string[]>(Array.from({ length: 6 }, () => ""));
  const emailOtpRefs = useRef<HTMLInputElement[]>([]);
  const [emailBusy, setEmailBusy] = useState(false);

  const [pwOtpSent, setPwOtpSent] = useState(false);
  const [pwOtp, setPwOtp] = useState<string[]>(Array.from({ length: 6 }, () => ""));
  const pwOtpRefs = useRef<HTMLInputElement[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const emailOtpString = useMemo(() => emailOtp.join("").trim(), [emailOtp]);
  const pwOtpString = useMemo(() => pwOtp.join("").trim(), [pwOtp]);

  const savedPhone = account?.phoneNo?.trim() ?? "";
  const phoneDraft = phone.trim();
  const phoneChanged = phoneDraft !== savedPhone;
  const phoneValid = PHONE_RE.test(phoneDraft);

  const applyAccount = useCallback(
    (data: AccountSettings) => {
      setAccount(data);
      setPhone(data.phoneNo ?? "");
      if (userId) writeAccountSettingsCache(userId, data);
    },
    [userId],
  );

  const load = useCallback(
    async (options?: { skipCache?: boolean; silent?: boolean }) => {
      if (!userId) return;

      if (!options?.skipCache) {
        const cached = readAccountSettingsCache(userId);
        if (cached) {
          applyAccount(cached);
          if (!options?.silent) setLoading(false);
          setError("");
          return;
        }
      }

      if (!options?.silent) setLoading(true);
      setError("");
      try {
        const data = await getAccountSettings();
        applyAccount(data);
      } catch (e) {
        if (!options?.silent) {
          setError(e instanceof Error ? e.message : "Failed to load settings");
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [userId, applyAccount],
  );

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const cached = readAccountSettingsCache(userId);
    if (cached) {
      applyAccount(cached);
      setLoading(false);
      load({ skipCache: true, silent: true });
    } else {
      load();
    }
  }, [userId, applyAccount, load]);

  function revertPhone() {
    if (!phoneChanged) return;
    void (async () => {
      const ok = await confirm({
        title: "Discard phone changes?",
        description: "Your unsaved phone number will be reverted to the saved value.",
        confirmLabel: "Discard",
        destructive: true,
      });
      if (!ok) return;
      setPhone(savedPhone);
      setError("");
    })();
  }

  async function handleSavePhone() {
    if (!phoneChanged) return;

    const trimmed = phoneDraft;
    if (!PHONE_RE.test(trimmed)) {
      setError("Enter a valid 10-digit Indian mobile number (starts with 6–9).");
      return;
    }

    const previousLabel = savedPhone || "not set";
    const ok = await confirm({
      title: "Update phone number?",
      description: (
        <>
          <p style={{ margin: 0 }}>Current: <strong>{previousLabel}</strong></p>
          <p style={{ margin: "0.5rem 0 0" }}>New: <strong>{trimmed}</strong></p>
          <p style={{ margin: "0.75rem 0 0" }}>This number will be used for account contact.</p>
        </>
      ),
      confirmLabel: "Update phone",
    });
    if (!ok) return;

    setSavingPhone(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updatePhone(trimmed);
      applyAccount(updated);
      setSuccess("Phone number updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update phone");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleSendEmailOtp() {
    const e = newEmail.trim().toLowerCase();
    if (!validateEmail(e)) {
      setError("Enter a valid new email address.");
      return;
    }
    if (account && e === account.email.toLowerCase()) {
      setError("New email must be different from your current email.");
      return;
    }

    const ok = await confirm({
      title: "Send verification code?",
      description: (
        <>
          A 6-digit code will be sent to <strong>{e}</strong>. You will need access to that inbox to
          complete the email change.
        </>
      ),
      confirmLabel: "Send code",
    });
    if (!ok) return;

    setEmailBusy(true);
    setError("");
    setSuccess("");
    try {
      await sendEmailChangeOtp(e);
      setEmailOtpSent(true);
      setEmailOtp(Array.from({ length: 6 }, () => ""));
      setSuccess(`Verification code sent to ${e}.`);
      setTimeout(() => emailOtpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleVerifyEmail() {
    const e = newEmail.trim().toLowerCase();
    if (emailOtpString.length < 6) {
      setError("Enter the 6-digit code sent to your new email.");
      return;
    }

    const ok = await confirm({
      title: "Update email address?",
      description: (
        <>
          Your sign-in email will change to <strong>{e}</strong>. You may need to sign in again on
          other devices.
        </>
      ),
      confirmLabel: "Verify & update",
    });
    if (!ok) return;

    setEmailBusy(true);
    setError("");
    setSuccess("");
    try {
      await verifyEmailChange(e, emailOtpString);
      await refreshUser();
      setEmailOtpSent(false);
      setNewEmail("");
      setEmailOtp(Array.from({ length: 6 }, () => ""));
      await load({ skipCache: true, silent: true });
      setSuccess("Email updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email verification failed");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSendPasswordOtp() {
    const ok = await confirm({
      title: "Send verification code?",
      description: account ? (
        <>
          A 6-digit code will be sent to <strong>{account.email}</strong> so you can{" "}
          {account.hasPassword ? "change" : "set"} your password.
        </>
      ) : (
        "A verification code will be sent to your email so you can update your password."
      ),
      confirmLabel: "Send code",
    });
    if (!ok) return;

    setPwBusy(true);
    setError("");
    setSuccess("");
    try {
      await sendPasswordChangeOtp();
      setPwOtpSent(true);
      setPwOtp(Array.from({ length: 6 }, () => ""));
      setSuccess(
        account
          ? `If eligible, a verification code was sent to ${account.email}.`
          : "Verification code sent to your email.",
      );
      setTimeout(() => pwOtpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setPwBusy(false);
    }
  }

  async function handleChangePassword() {
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (pwOtpString.length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    const ok = await confirm({
      title: account?.hasPassword ? "Change password?" : "Set password?",
      description: "Your new password will take effect immediately after confirmation.",
      confirmLabel: account?.hasPassword ? "Update password" : "Set password",
    });
    if (!ok) return;

    setPwBusy(true);
    setError("");
    setSuccess("");
    try {
      await changePassword(pwOtpString, newPassword);
      setPwOtpSent(false);
      setNewPassword("");
      setConfirmPassword("");
      setPwOtp(Array.from({ length: 6 }, () => ""));
      await load({ skipCache: true, silent: true });
      setSuccess("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setPwBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="dash-content">
        <div className="card card--elevated dash-welcome-card">
          <p className="dash-welcome-card__eyebrow">Account</p>
          <p className="dash-welcome-card__title">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-welcome-card">
        <p className="dash-welcome-card__eyebrow">Account</p>
        <p className="dash-welcome-card__title">
          Manage phone, email, and password
        </p>
        <p className="dash-muted" style={{ marginTop: 6 }}>
          Email changes require OTP verification on the new address.
        </p>
      </div>

      <div className="dash-tabs">
        <TabButton active={tab === "profile"} label="Profile" onClick={() => { setTab("profile"); setError(""); setSuccess(""); }} />
        <TabButton active={tab === "password"} label="Password" onClick={() => { setTab("password"); setError(""); setSuccess(""); }} />
      </div>

      {tab === "profile" && account && (
        <div className="dash-settings-grid">
          <div className="card card--elevated dash-form-stack">
            <p className="dash-section-title">Phone number</p>
            <p className="dash-muted">
              Saved number: <strong className="text-[var(--color-text)]">{savedPhone || "-"}</strong>
            </p>
            <div>
              <FieldLabel>New mobile (India)</FieldLabel>
              <input
                type="tel"
                className="dash-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={savedPhone || "10-digit mobile number"}
                maxLength={10}
              />
              {phoneChanged && !phoneValid && phoneDraft.length > 0 && (
                <p className="dash-muted" style={{ color: "#dc2626", marginTop: 6 }}>
                  Enter a valid 10-digit number (starts with 6–9).
                </p>
              )}
              {phoneChanged && phoneValid && (
                <p className="dash-muted" style={{ marginTop: 6 }}>
                  Unsaved change, confirm before updating.
                </p>
              )}
            </div>
            <div className="dash-form-actions">
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={savingPhone || !phoneChanged || !phoneValid}
                onClick={() => void handleSavePhone()}
              >
                {savingPhone ? "Saving…" : "Save phone"}
              </button>
              {phoneChanged && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={savingPhone}
                  onClick={revertPhone}
                >
                  Discard changes
                </button>
              )}
            </div>
          </div>

          <div className="card card--elevated dash-form-stack">
            <p className="dash-section-title">Email address</p>
            <div>
              <FieldLabel>Current email</FieldLabel>
              <input type="email" className="dash-input" value={account.email} readOnly disabled />
            </div>
            <div>
              <FieldLabel>New email</FieldLabel>
              <input
                type="email"
                className="dash-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new.email@company.com"
                disabled={emailOtpSent && emailBusy}
              />
            </div>
            {!emailOtpSent ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                style={{ alignSelf: "flex-start" }}
                disabled={emailBusy}
                onClick={() => void handleSendEmailOtp()}
              >
                {emailBusy ? "Sending…" : "Send verification code"}
              </button>
            ) : (
              <>
                <p className="dash-muted">
                  Enter the 6-digit code sent to <strong className="text-[var(--color-text)]">{newEmail}</strong>.
                </p>
                <OtpInput otp={emailOtp} setOtp={setEmailOtp} inputRefs={emailOtpRefs} />
                <div className="dash-form-actions">
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={emailBusy || emailOtpString.length < 6}
                    onClick={() => void handleVerifyEmail()}
                  >
                    {emailBusy ? "Verifying…" : "Verify & update email"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={emailBusy}
                    onClick={() => {
                      setEmailOtpSent(false);
                      setEmailOtp(Array.from({ length: 6 }, () => ""));
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "password" && account && (
        <div className="card card--elevated dash-form-stack">
          <p className="dash-section-title">
            {account.hasPassword ? "Change password" : "Set password"}
          </p>
          <p className="dash-muted">
            A verification code will be sent to <strong className="text-[var(--color-text)]">{account.email}</strong>.
            You can then set a new password (8+ characters, at least one letter and one digit).
          </p>

          {!pwOtpSent ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              style={{ alignSelf: "flex-start" }}
              disabled={pwBusy}
              onClick={() => void handleSendPasswordOtp()}
            >
              {pwBusy ? "Sending…" : "Send verification code"}
            </button>
          ) : (
            <>
              <OtpInput otp={pwOtp} setOtp={setPwOtp} inputRefs={pwOtpRefs} />
              <div>
                <FieldLabel>New password</FieldLabel>
                <input
                  type="password"
                  className="dash-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <FieldLabel>Confirm password</FieldLabel>
                <input
                  type="password"
                  className="dash-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="dash-form-actions">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={pwBusy}
                  onClick={() => void handleChangePassword()}
                >
                  {pwBusy ? "Updating…" : account.hasPassword ? "Update password" : "Set password"}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={pwBusy}
                  onClick={() => {
                    setPwOtpSent(false);
                    setPwOtp(Array.from({ length: 6 }, () => ""));
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
