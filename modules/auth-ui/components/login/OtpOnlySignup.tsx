"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { getPostLoginPath } from "@/modules/platform/rbac/roles";
import { INDUSTRIES, INDUSTRY_SECTORS } from "@/modules/auth-ui/constants/industries";
import InputField from "../shared/InputField";
import SearchableSelectField from "../shared/SearchableSelectField";
import OtpInput from "../shared/OtpInput";
import { apiFetch, getErrorMessage, validateEmail, validatePassword } from "../shared/api";
import { Spinner, LockIcon } from "../shared/icons";
import { ErrorMessage, SuccessMessage } from "../shared/StatusMessage";
import { State, City } from "country-state-city";

import {
  Building2,
  ClipboardCheck,
  FileSearch,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

type Status = "idle" | "loading";

const ROLES = [
  { value: "MSME",            label: "MSME",              icon: Building2,      desc: "Micro, Small & Medium Enterprise" },
  { value: "CA",              label: "CA",                icon: ClipboardCheck, desc: "Chartered Accountant" },
  { value: "CS",              label: "CS",                icon: FileSearch,     desc: "Company Secretary" },
  { value: "ESG_CONSULTANT",  label: "ESG Consultant",    icon: BarChart3,      desc: "Sustainability advisor" },
  { value: "ASSURER_AUDITOR", label: "Assurer / Auditor", icon: ShieldCheck,    desc: "Third-party assurer" },
];

const phoneRe = /^[6-9][0-9]{9}$/;
const gstRe   = /^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const pinRe   = /^$|^[0-9]{6}$/;

const selectClass =
  "w-full rounded-[12px] px-[14px] py-[13px] text-[14px] outline-none " +
  "bg-[var(--color-surface)] border border-[var(--color-border)] " +
  "text-[var(--color-text)] " +
  "transition-all duration-200 " +
  "focus:border-[var(--brand-500)] focus:ring-[3px] focus:ring-[var(--brand-focus-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

function SelectField({
  label, value, onChange, options, placeholder, disabled, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; disabled?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${selectClass} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : ""}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function SignupStepper({ current }: { current: number }) {
  const steps = ["Role", "Details", "Profile", "Verify"];
  return (
    <div className="mb-6 grid grid-cols-4 gap-2 text-center">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-col items-center gap-2 min-w-0">
          <div className={`h-2 w-full rounded-full transition-all ${
            i === current ? "bg-[var(--color-primary)]"
              : i < current ? "bg-emerald-400"
              : "bg-[var(--color-border)]"
          }`} aria-hidden />
          <span className={`text-[10px] sm:text-xs leading-tight ${
            i === current ? "font-semibold text-[var(--color-primary)]"
              : i < current ? "font-medium text-emerald-500"
              : "text-[var(--color-text-muted)]"
          }`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function OtpOnlySignup() {
  const { establishSession } = useAuth();
  const searchParams = useSearchParams();
  const postLoginRedirect = searchParams.get("redirect");

  const [step, setStep]     = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr]       = useState("");
  const [ok, setOk]         = useState("");
  const [cd, setCd]         = useState(0);

  // ── Password checkbox state ──────────────────────────────────────────────
  const [setPasswordEnabled, setSetPasswordEnabled] = useState(false);
  const [password, setPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [otp, setOtp]           = useState<string[]>(() => Array.from({ length: 6 }, () => ""));
  const inputRefs               = useRef<HTMLInputElement[]>([]);
  const passwordSectionRef      = useRef<HTMLDivElement>(null);
  const passwordFieldsRef       = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    role: "",
    sector: "",
    subsector: "",
    annualRevenue: "",
    companyName: "",
    gstNumber: "",
    cinNumber: "",
    icaiMemberNumber: "",
    icsiMemberNumber: "",
    consultantId: "",
    frmId: "",
    organizationName: "",
    expertiseArea: "",
    accreditationNo: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    city: "",
    state: "",
    stateCode: "",
    pincode: "",
  });

  const subsectorOptions = useMemo(
    () => (form.sector ? INDUSTRY_SECTORS[form.sector] ?? [] : []),
    [form.sector]
  );

  const indianStates  = useMemo(() => State.getStatesOfCountry("IN"), []);
  const stateOptions = useMemo(
    () => indianStates.map((s) => ({ value: s.isoCode, label: s.name })),
    [indianStates],
  );
  const citiesOfState = useMemo(
    () => (form.stateCode ? City.getCitiesOfState("IN", form.stateCode) : []),
    [form.stateCode],
  );
  const cityOptions = useMemo(
    () => citiesOfState.map((c) => ({ value: c.name, label: c.name })),
    [citiesOfState],
  );

  const otpString = useMemo(() => otp.join("").trim(), [otp]);

  const setField =
    (k: keyof typeof form) =>
    (value: string) => {
      setForm((f) => ({ ...f, [k]: value }));
      setFieldErr((fe) => ({ ...fe, [k]: "" }));
      setErr("");
    };

  useEffect(() => {
    if (cd <= 0) return;
    const t = setTimeout(() => setCd((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cd]);

  useEffect(() => {
    if (!setPasswordEnabled) return;
    const t = window.setTimeout(() => {
      (passwordFieldsRef.current ?? passwordSectionRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
    return () => window.clearTimeout(t);
  }, [setPasswordEnabled]);

  // ── Validate password fields if checkbox is checked ──────────────────────
  function validatePasswordFields(): boolean {
    if (!setPasswordEnabled) return true;
    const pwErr = validatePassword(password);
    if (pwErr) { setPasswordErr(pwErr); return false; }
    if (password !== confirmPassword) { setPasswordErr("Passwords do not match"); return false; }
    setPasswordErr("");
    return true;
  }

  async function submitProfile() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim() || form.firstName.length < 2) e.firstName = "Min 2 characters";
    if (!form.lastName.trim() || form.lastName.length < 2)   e.lastName  = "Min 2 characters";
    if (!validateEmail(form.email)) e.email = "Valid email required";
    if (!form.phoneNo.trim()) {
      e.phoneNo = "Phone number is required";
    } else if (!phoneRe.test(form.phoneNo)) {
      e.phoneNo = "Enter valid 10-digit mobile number";
    }
    if (form.pincode && !pinRe.test(form.pincode)) e.pincode = "Must be 6 digits";

    if (Object.keys(e).length) {
      setFieldErr(e);
      setErr("Please fix the highlighted fields.");
      return;
    }

    if (!validatePasswordFields()) return;

    setStatus("loading");
    setErr("");

    try {
      const { stateCode, ...rest } = form;
      void stateCode;
      const payload: Record<string, unknown> = {
        ...rest,
        annualRevenue: form.annualRevenue ? parseFloat(form.annualRevenue) : undefined,
        // Only include password if checkbox was checked and field is non-empty
        ...(setPasswordEnabled && password ? { password } : {}),
      };

      await apiFetch("/api/auth/pre-register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setStep(3);
      setCd(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (ex: unknown) {
      setErr(getErrorMessage(ex, "Failed to send OTP"));
    } finally {
      setStatus("idle");
    }
  }

  async function verifyRegOtp() {
    if (otpString.length < 6) { setErr("Enter all 6 digits"); return; }
    setStatus("loading");
    setErr("");
    try {
      await apiFetch("/api/auth/verify-registration", {
        method: "POST",
        body: JSON.stringify({ email: form.email, otp: otpString }),
      }, { clearSession: false });
      setOk("Account created! Redirecting…");
      const me = await establishSession();
      if (!me) {
        setErr(
          process.env.NODE_ENV === "development"
            ? "Account created, but the session could not be started. For local dev, set cookie.secure=false and cookie.same-site=Lax in the API."
            : "Account created, but the session could not be started. Please sign in.",
        );
        return;
      }
      window.setTimeout(
        () => window.location.assign(getPostLoginPath(me.role, postLoginRedirect)),
        300,
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to verify"));
    } finally {
      setStatus("idle");
    }
  }

  async function resendOtp() {
    if (cd > 0) return;
    setStatus("loading");
    try {
      await apiFetch(
        `/api/auth/resend-otp?email=${encodeURIComponent(form.email)}&flow=register`,
        { method: "POST" }
      );
      setCd(30);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to resend OTP"));
    } finally {
      setStatus("idle");
    }
  }

  // ── Step 0: Role selection ───────────────────────────────────────────────
  function renderStep0() {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
            Who are you?
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Select the role that best describes you.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const selected = form.role === r.value;
            return (
              <button key={r.value} type="button"
                onClick={() => { setForm((f) => ({ ...f, role: r.value })); setErr(""); }}
                className={`hover-lift flex items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                  selected
                    ? r.value === "ASSURER_AUDITOR"
                      ? "border-red-500/70 bg-red-500/5 shadow-sm"
                      : "border-[var(--color-primary)] bg-[var(--brand-tint-06)] shadow-sm"
                    : "border-[var(--color-border)] bg-[var(--color-card)]"
                }`}>
                <Icon className={`h-[18px] w-[18px] transition-all duration-300 ${
                  selected ? "text-[var(--color-primary)] dark:text-emerald-400 dark:drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                    : "text-[var(--color-text-muted)]"
                }`} strokeWidth={1.8} />
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${selected ? "text-[var(--color-text-heading)]" : "text-[var(--color-text-muted)]"}`}>
                    {r.label}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">{r.desc}</div>
                </div>
                {selected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-xs">✓</div>
                )}
              </button>
            );
          })}
        </div>

        <ErrorMessage message={err} />

        <div className="mt-auto">
          <button type="button"
            onClick={() => { if (!form.role) { setErr("Please select a role"); return; } setStep(1); }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-white">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Role-specific details ────────────────────────────────────────
  function renderStep1() {
    const roleLabel = ROLES.find((r) => r.value === form.role)?.label;

    function validate() {
      const e: Record<string, string> = {};
      if (form.role === "MSME") {
        if (!form.sector) e.sector = "Please select an industry";
        if (!form.subsector) e.subsector = "Please select a sub-sector";
      }
      if (form.role === "CA" && !form.icaiMemberNumber.trim()) e.icaiMemberNumber = "Required";
      if (form.role === "CS" && !form.icsiMemberNumber.trim()) e.icsiMemberNumber = "Required";
      if (form.role === "ESG_CONSULTANT" && !form.consultantId.trim()) e.consultantId = "Required";
      if (form.role === "ASSURER_AUDITOR" && !form.accreditationNo.trim()) e.accreditationNo = "Required";
      if (form.gstNumber && !gstRe.test(form.gstNumber)) e.gstNumber = "Invalid GST format (e.g. 27AAAAA0000A1Z5)";
      return e;
    }

    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
            {roleLabel} details
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Fill in your professional information.</p>
        </div>

        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {form.role === "MSME" && (
            <>
              <SelectField label="Industry *" value={form.sector}
                onChange={(val) => { setForm((f) => ({ ...f, sector: val, subsector: "" })); setFieldErr((fe) => ({ ...fe, sector: "", subsector: "" })); setErr(""); }}
                placeholder="Select industry"
                options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
                error={fieldErr.sector} />
              <SelectField label="Sub-sector *" value={form.subsector}
                onChange={(val) => setField("subsector")(val)}
                disabled={!form.sector}
                placeholder={form.sector ? "Select sub-sector" : "Select an industry first"}
                options={subsectorOptions.map((s) => ({ value: s, label: s }))}
                error={fieldErr.subsector} />
              <InputField label="Company name" placeholder="Your company" value={form.companyName} onChange={setField("companyName")} />
              <InputField label="GST number" placeholder="27AAAAA0000A1Z5" value={form.gstNumber} onChange={setField("gstNumber")} error={fieldErr.gstNumber} />
              <InputField label="CIN number" placeholder="Optional" value={form.cinNumber} onChange={setField("cinNumber")} />
              <InputField label="Annual revenue (₹)" placeholder="e.g. 5000000" value={form.annualRevenue} onChange={setField("annualRevenue")} />
            </>
          )}
          {form.role === "CA" && (
            <InputField label="ICAI member number *" placeholder="e.g. ICAI-MH-123456" value={form.icaiMemberNumber} onChange={setField("icaiMemberNumber")} error={fieldErr.icaiMemberNumber} />
          )}
          {form.role === "CS" && (
            <>
              <InputField label="ICSI member number *" placeholder="e.g. ICSI-DL-78901" value={form.icsiMemberNumber} onChange={setField("icsiMemberNumber")} error={fieldErr.icsiMemberNumber} />
              <InputField label="Company name" placeholder="Your firm" value={form.companyName} onChange={setField("companyName")} />
            </>
          )}
          {form.role === "ESG_CONSULTANT" && (
            <>
              <InputField label="Consultant ID *" placeholder="e.g. ESG-CON-9901" value={form.consultantId} onChange={setField("consultantId")} error={fieldErr.consultantId} />
              <InputField label="FRM ID" placeholder="Optional" value={form.frmId} onChange={setField("frmId")} />
              <InputField label="Organisation name" placeholder="Your firm" value={form.organizationName} onChange={setField("organizationName")} />
              <InputField label="Expertise area" placeholder="e.g. Carbon Accounting" value={form.expertiseArea} onChange={setField("expertiseArea")} />
            </>
          )}
          {form.role === "ASSURER_AUDITOR" && (
            <>
              <InputField label="Accreditation number *" placeholder="e.g. ACCR-NAB-20240012" value={form.accreditationNo} onChange={setField("accreditationNo")} error={fieldErr.accreditationNo} />
              <InputField label="Organisation name" placeholder="Your firm" value={form.organizationName} onChange={setField("organizationName")} />
            </>
          )}
        </div>

        <ErrorMessage message={err} />

        <div className="mt-auto flex gap-3">
          <button type="button" onClick={() => setStep(0)}
            className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
            ← Back
          </button>
          <button type="button"
            onClick={() => {
              const e = validate();
              if (Object.keys(e).length) { setFieldErr(e); setErr("Please fix the highlighted fields."); return; }
              setStep(2);
            }}
            className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-sm font-medium text-white">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Personal details + optional password ─────────────────────────
  function renderStep2() {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
            Personal details
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Almost there, tell us about yourself.
          </p>
        </div>

        <div className="flex max-h-[340px] flex-col gap-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="First name *" placeholder="Ravi" value={form.firstName} onChange={setField("firstName")} error={fieldErr.firstName} />
            <InputField label="Last name *" placeholder="Sharma" value={form.lastName} onChange={setField("lastName")} error={fieldErr.lastName} />
          </div>

          <InputField label="Email *" type="email" placeholder="ravi@example.com" value={form.email} onChange={setField("email")} error={fieldErr.email} />

          <div>
            <label className="mb-2 block text-sm font-medium">Phone number *</label>
            <div className={`flex items-center overflow-hidden rounded-[12px] border bg-[var(--color-surface)] ${
              fieldErr.phoneNo ? "border-red-500" : "border-[var(--color-border)] focus-within:border-[var(--brand-500)]"
            }`}>
              <div className="flex items-center px-4 text-sm font-medium text-[var(--color-text)] border-r border-[var(--color-border)]">+91</div>
              <input type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210"
                value={form.phoneNo}
                onChange={(e) => setField("phoneNo")(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-transparent px-[14px] py-[13px] text-[14px] outline-none text-[var(--color-text)]" />
            </div>
            {fieldErr.phoneNo && <p className="mt-2 text-sm text-red-500">{fieldErr.phoneNo}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SearchableSelectField
              label="State"
              value={form.stateCode}
              onChange={(val) => {
                const selected = indianStates.find((s) => s.isoCode === val);
                setForm((f) => ({ ...f, stateCode: val, state: selected?.name ?? "", city: "" }));
                setErr("");
              }}
              placeholder="Search state…"
              options={stateOptions}
            />
            <SearchableSelectField
              label="City"
              value={form.city}
              onChange={(val) => setField("city")(val)}
              disabled={!form.stateCode}
              placeholder="Search city…"
              options={cityOptions}
              emptyMessage={form.stateCode ? "No cities found" : "Select a state first"}
            />
          </div>

          <InputField label="Pincode" placeholder="411001" value={form.pincode} onChange={setField("pincode")} error={fieldErr.pincode} />

          {/* ── Password checkbox ──────────────────────────────────────── */}
          <div ref={passwordSectionRef} className="mt-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              {/* Custom styled checkbox */}
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={setPasswordEnabled}
                  onChange={(e) => {
                    setSetPasswordEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setPassword("");
                      setConfirmPassword("");
                      setPasswordErr("");
                    }
                  }}
                />
                <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                  setPasswordEnabled
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}>
                  {setPasswordEnabled && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Set a password</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  Optional, lets you log in with email + password in addition to OTP.
                </p>
              </div>
            </label>

            {/* Password fields, shown only when checkbox is checked */}
            {setPasswordEnabled && (
              <div ref={passwordFieldsRef} className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
                <InputField
                  label="Password"
                  type="password"
                  placeholder="Min 8 chars, include a digit"
                  value={password}
                  onChange={(v) => { setPassword(v); setPasswordErr(""); }}
                  icon={<LockIcon />}
                  autoComplete="new-password"
                  hint="At least 8 characters with one letter and one digit"
                />
                <InputField
                  label="Confirm password"
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(v) => { setConfirmPassword(v); setPasswordErr(""); }}
                  icon={<LockIcon />}
                  autoComplete="new-password"
                />
                {passwordErr && (
                  <p className="text-sm text-red-500">{passwordErr}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <ErrorMessage message={err} />

        <div className="mt-auto flex gap-3">
          <button type="button" onClick={() => setStep(1)}
            className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
            ← Back
          </button>
          <button type="button" onClick={submitProfile} disabled={status === "loading"}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-sm font-medium text-white disabled:opacity-70">
            {status === "loading" ? <><Spinner />Sending OTP…</> : "Continue →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: OTP verification ─────────────────────────────────────────────
  function renderStep3() {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)]">
            Verify your email
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-[var(--color-text)]">{form.email}</span>
          </p>
        </div>

        <OtpInput otp={otp} setOtp={setOtp} inputRefs={inputRefs} />

        <ErrorMessage message={err} />
        <SuccessMessage message={ok} />

        <div className="mt-auto flex flex-col gap-3">
          <button type="button" onClick={verifyRegOtp}
            disabled={status === "loading" || otpString.length < 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-white disabled:opacity-70">
            {status === "loading" ? <><Spinner />Verifying…</> : "Create account"}
          </button>
          <button type="button" onClick={resendOtp}
            disabled={status === "loading" || cd > 0}
            className="w-full text-center text-sm underline text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-60">
            {cd > 0 ? `Resend in ${cd}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <SignupStepper current={step} />
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}
