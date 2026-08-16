"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { getPostLoginPath } from "@/modules/platform/rbac/roles";
import InputField from "../shared/InputField";
import OtpInput from "../shared/OtpInput";
import { apiFetch, getErrorMessage, validateEmail, validatePassword } from "../shared/api";
import { Spinner, MailIcon, LockIcon } from "../shared/icons";
import { ErrorMessage, SuccessMessage } from "../shared/StatusMessage";

type Status = "idle" | "loading";
type Step = "email" | "otp";

// ── Forgot-password sub-flow ──────────────────────────────────────────────────

function ForgotPasswordFlow({ onBack }: { onBack: () => void }) {
  const [fpStep, setFpStep] = useState<"email" | "otp" | "password" | "done">("email");
  const [fpEmail, setFpEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState<string[]>(Array.from({ length: 6 }, () => ""));
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const otpString = useMemo(() => otp.join("").trim(), [otp]);

  async function sendResetOtp() {
    const e = fpEmail.trim();
    if (!validateEmail(e)) { setError("Enter a valid email address"); return; }
    setStatus("loading"); setError(""); setSuccess("");
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: e }),
      });
      setFpStep("otp");
      setSuccess("Reset code sent if this email is registered.");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send reset code"));
    } finally { setStatus("idle"); }
  }

  function continueFromOtp() {
    if (otpString.length < 6) { setError("Enter all 6 digits"); return; }
    setError("");
    setSuccess("");
    setFpStep("password");
  }

  async function resetPassword() {
    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setStatus("loading"); setError(""); setSuccess("");
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: fpEmail.trim(), otp: otpString, newPassword }),
      });
      setFpStep("done");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Reset failed"));
    } finally { setStatus("idle"); }
  }

  if (fpStep === "done") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">Password updated</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">You can now log in with your new password.</p>
        </div>
        <button type="button" onClick={onBack} className="btn-primary w-full">
          Back to login
        </button>
      </div>
    );
  }

  if (fpStep === "otp") {
    return (
      <div className="space-y-5">
        <button
          onClick={() => { setFpStep("email"); setError(""); setSuccess(""); setOtp(Array.from({ length: 6 }, () => "")); }}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Back
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">Verify reset code</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-[var(--color-text)]">{fpEmail}</span>
          </p>
        </div>
        <OtpInput otp={otp} setOtp={setOtp} inputRefs={inputRefs} />
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <button
          type="button"
          onClick={continueFromOtp}
          disabled={status === "loading" || otpString.length < 6}
          className="btn-primary w-full disabled:opacity-70"
        >
          Continue
        </button>
      </div>
    );
  }

  if (fpStep === "password") {
    return (
      <div className="space-y-5">
        <button
          onClick={() => { setFpStep("otp"); setError(""); setSuccess(""); }}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          ← Back
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">Set new password</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Choose a new password for <span className="font-medium text-[var(--color-text)]">{fpEmail}</span>
          </p>
        </div>
        <InputField
          label="New password"
          type="password"
          placeholder="Min 8 chars, include a digit"
          value={newPassword}
          onChange={setNewPassword}
          icon={<LockIcon />}
          autoComplete="new-password"
          hint="At least 8 characters with one letter and one digit"
        />
        <InputField
          label="Confirm password"
          type="password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          icon={<LockIcon />}
          autoComplete="new-password"
        />
        <ErrorMessage message={error} />
        <button
          type="button"
          onClick={resetPassword}
          disabled={status === "loading"}
          className="btn-primary w-full disabled:opacity-70"
        >
          {status === "loading" ? <><Spinner />Updating…</> : "Update password"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
        ← Back to login
      </button>
      <div>
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">Forgot password?</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Enter your email and we&apos;ll send a reset code.</p>
      </div>
      <InputField label="Email" type="email" placeholder="you@company.com"
        value={fpEmail} onChange={(v) => { setFpEmail(v); setError(""); }}
        icon={<MailIcon />} autoComplete="email" />
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />
      <button type="button" onClick={sendResetOtp} disabled={status === "loading"}
        className="btn-primary w-full disabled:opacity-70">
        {status === "loading" ? <><Spinner />Sending…</> : "Send reset code"}
      </button>
    </div>
  );
}

// ── Main login component ──────────────────────────────────────────────────────

export default function OtpOnlyLogin() {
  const { establishSession } = useAuth();
  const searchParams = useSearchParams();
  const postLoginRedirect = searchParams.get("redirect");

  // Password checkbox, checked = use password login, unchecked = use OTP
  const [usePassword, setUsePassword] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [showForgot, setShowForgot] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState<string[]>(Array.from({ length: 6 }, () => ""));
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const otpString = useMemo(() => otp.join("").trim(), [otp]);

  function resetFlow() {
    setStep("email");
    setOtp(Array.from({ length: 6 }, () => ""));
    setError(""); setSuccess("");
  }

  // ── OTP flow ───────────────────────────────────────────────────────────────

  async function sendOtp() {
    const e = email.trim();
    if (!validateEmail(e)) { setError("Enter a valid email address"); return; }
    setStatus("loading"); setError(""); setSuccess("");
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email: e }) });
      setStep("otp");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send OTP"));
    } finally { setStatus("idle"); }
  }

  async function verifyOtp() {
    const e = email.trim();
    if (!validateEmail(e)) { setError("Enter a valid email address"); setStep("email"); return; }
    if (otpString.length < 6) { setError("Enter all 6 digits"); return; }
    setStatus("loading"); setError(""); setSuccess("");
    try {
      await apiFetch("/api/auth/verify-login", {
        method: "POST",
        body: JSON.stringify({ email: e, otp: otpString }),
      }, { clearSession: false });
      const me = await establishSession();
      if (!me) {
        setError(
          process.env.NODE_ENV === "development"
            ? "Signed in, but the session could not be started. For local dev, set cookie.secure=false and cookie.same-site=Lax in the API, then restart both servers."
            : "Signed in, but the session could not be started. Please try again.",
        );
        return;
      }
      setSuccess("Verified. Redirecting…");
      setTimeout(
        () => window.location.assign(getPostLoginPath(me.role, postLoginRedirect)),
        300,
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Invalid OTP"));
    } finally { setStatus("idle"); }
  }

  async function resendOtp() {
    const e = email.trim();
    if (!validateEmail(e)) { setError("Enter a valid email address"); setStep("email"); return; }
    setStatus("loading"); setError(""); setSuccess("");
    try {
      await apiFetch(`/api/auth/resend-otp?email=${encodeURIComponent(e)}&flow=login`, { method: "POST" });
      setSuccess("OTP resent.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to resend OTP"));
    } finally { setStatus("idle"); }
  }

  // ── Password flow ─────────────────────────────────────────────────────────

  async function loginWithPassword() {
    const e = email.trim();
    if (!validateEmail(e)) { setError("Enter a valid email address"); return; }
    if (!password) { setError("Enter your password"); return; }
    setStatus("loading"); setError(""); setSuccess("");
    try {
      await apiFetch("/api/auth/login-password", {
        method: "POST",
        body: JSON.stringify({ email: e, password }),
      }, { clearSession: false });
      const me = await establishSession();
      if (!me) {
        setError(
          process.env.NODE_ENV === "development"
            ? "Signed in, but the session could not be started. For local dev, set cookie.secure=false and cookie.same-site=Lax in the API, then restart both servers."
            : "Signed in, but the session could not be started. Please try again.",
        );
        return;
      }
      setSuccess("Logged in. Redirecting…");
      setTimeout(
        () => window.location.assign(getPostLoginPath(me.role, postLoginRedirect)),
        300,
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Invalid email or password"));
    } finally { setStatus("idle"); }
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  if (showForgot) {
    return <ForgotPasswordFlow onBack={() => { setShowForgot(false); setError(""); }} />;
  }

  // ── OTP: code step ────────────────────────────────────────────────────────

  if (!usePassword && step === "otp") {
    return (
      <div className="space-y-5">
        <div>
          <button type="button" onClick={resetFlow} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">← Back</button>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">Verify OTP</h2>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
            Sent to <span className="font-medium text-[var(--color-text)]">{email.trim()}</span>
          </p>
        </div>
        <OtpInput otp={otp} setOtp={setOtp} inputRefs={inputRefs} />
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <button type="button" onClick={verifyOtp} disabled={status === "loading"}
          className="btn-primary w-full disabled:opacity-70">
          {status === "loading" ? <><Spinner />Verifying…</> : "Verify & Continue"}
        </button>
        <button type="button" onClick={resendOtp} disabled={status === "loading"}
          className="w-full text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-70">
          Resend OTP
        </button>
      </div>
    );
  }

  // ── Email step (OTP or password) ──────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Welcome back</h2>
        <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-muted)]">
          {usePassword ? "Sign in with your email and password." : "Log in securely with a one-time password."}
        </p>
      </div>

      <InputField label="Email" type="email" placeholder="you@company.com"
        value={email} onChange={(v) => { setEmail(v); setError(""); }}
        icon={<MailIcon />} autoComplete="email" />

      <label className="flex cursor-pointer items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <input type="checkbox" className="sr-only" checked={usePassword}
            onChange={(e) => {
              setUsePassword(e.target.checked);
              setPassword(""); setError(""); resetFlow();
            }} />
          <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ${
            usePassword
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}>
            {usePassword && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">Sign in with password instead</span>
      </label>

      {usePassword && (
        <InputField label="Password" type="password" placeholder="Your password"
          value={password} onChange={(v) => { setPassword(v); setError(""); }}
          icon={<LockIcon />} autoComplete="current-password" />
      )}

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <button
        type="button"
        onClick={usePassword ? loginWithPassword : sendOtp}
        disabled={status === "loading"}
        className="btn-primary w-full disabled:opacity-70">
        {status === "loading"
          ? <><Spinner />{usePassword ? "Signing in…" : "Sending OTP…"}</>
          : usePassword ? "Sign in" : "Continue"}
      </button>

      <div className="text-center">
        <button type="button" onClick={() => setShowForgot(true)}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Forgot password?
        </button>
      </div>
    </div>
  );
}
