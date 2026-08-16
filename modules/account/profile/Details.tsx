"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CalculatorKpi,
  CalculatorKpiStrip,
  CalculatorPanel,
} from "@/modules/calculators/ui/CalculatorLayout";
import { fetchWithSession } from "@/modules/platform/api/sessionFetch";

/* ─────────────────────────── types ─────────────────────────── */

type UserRole = "MSME" | "CA" | "CS" | "ESG_CONSULTANT" | "ASSURER_AUDITOR" | "ADMIN";

interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNo: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  profileImageUrl: string | null;
  isVerified: boolean;
}

interface BaseProfile {
  user: UserSummary;
  id: string;
  createdAt: string;
  updatedAt: string;
}
interface MsmeProfileResponse extends BaseProfile {
  sector: string;
  subsector: string | null;
  annualRevenue: number | null;
  companyName: string | null;
  gstNumber: string | null;
  cinNumber: string | null;
}
interface CaProfileResponse extends BaseProfile {
  icaiMemberNumber: string;
}
interface CsProfileResponse extends BaseProfile {
  icsiMemberNumber: string;
  companyName: string | null;
}
interface EsgConsultantProfileResponse extends BaseProfile {
  consultantId: string | null;
  frmId: string | null;
  organizationName: string | null;
  expertiseArea: string | null;
}
interface AssurerAuditorProfileResponse extends BaseProfile {
  accreditationNo: string | null;
  organizationName: string | null;
}

type AnyProfile =
  | MsmeProfileResponse
  | CaProfileResponse
  | CsProfileResponse
  | EsgConsultantProfileResponse
  | AssurerAuditorProfileResponse;

interface ProfileField {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}

interface ProfileDetailsProps {
  role: UserRole;
  prefetch?: Promise<Response> | null;
  embedded?: boolean;
  onOpenSettings?: () => void;
}

/* ─────────────────────────── cache ─────────────────────────── */

function cacheKey(role: UserRole) {
  return `profile_data_${role}`;
}

function readProfileCache(role: UserRole): AnyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(role));
    return raw ? (JSON.parse(raw) as AnyProfile) : null;
  } catch {
    return null;
  }
}

function writeProfileCache(role: UserRole, data: AnyProfile) {
  try {
    sessionStorage.setItem(cacheKey(role), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

function clearProfileCache(role: UserRole) {
  try {
    sessionStorage.removeItem(cacheKey(role));
  } catch {
    /* ignore */
  }
}

/* ─────────────────────────── constants ─────────────────────── */

const ROLE_META: Record<UserRole, { label: string; endpoint: string; blurb: string }> = {
  MSME: {
    label: "MSME",
    endpoint: "/api/profile/msme",
    blurb: "Company and sector details used across Lighthouse and calculator reports.",
  },
  CA: {
    label: "Chartered Accountant",
    endpoint: "/api/profile/ca",
    blurb: "Professional credentials shown to clients you onboard.",
  },
  CS: {
    label: "Company Secretary",
    endpoint: "/api/profile/cs",
    blurb: "Governance credentials linked to your client workspace.",
  },
  ESG_CONSULTANT: {
    label: "ESG Consultant",
    endpoint: "/api/profile/esg-consultant",
    blurb: "Consulting identity used for BRSR and calculator engagements.",
  },
  ASSURER_AUDITOR: {
    label: "Assurer / Auditor",
    endpoint: "/api/profile/assurer-auditor",
    blurb: "Assurance credentials for third-party review workflows.",
  },
  ADMIN: { label: "Admin", endpoint: "", blurb: "" },
};

/* ─────────────────────────── helpers ───────────────────────── */

function getInitials(u: UserSummary) {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

function capitalize(v: string | null | undefined) {
  if (!v) return "";
  return v.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(val: number | null) {
  if (val == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatProfileDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function displayValue(value: string | null | undefined) {
  return hasValue(value) ? value!.trim() : "Not provided";
}

function getSince(createdAt: string) {
  const d = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (d < 30) return `${d} day${d !== 1 ? "s" : ""}`;
  if (d < 365) {
    const m = Math.floor(d / 30);
    return `${m} month${m !== 1 ? "s" : ""}`;
  }
  const y = Math.floor(d / 365);
  return `${y} year${y !== 1 ? "s" : ""}`;
}

function formatLocation(user: UserSummary) {
  const parts = [user.city, user.state, user.pincode, user.country]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function profileFields(profile: AnyProfile): ProfileField[] {
  const { user } = profile;
  const common: ProfileField[] = [
    { label: "Email", value: user.email, copyable: true },
    { label: "Phone", value: user.phoneNo, copyable: true },
    { label: "City", value: user.city },
    { label: "State", value: user.state },
    { label: "Country", value: user.country },
    { label: "Pincode", value: user.pincode },
  ];

  switch (user.role) {
    case "MSME": {
      const p = profile as MsmeProfileResponse;
      return [
        { label: "Company name", value: p.companyName },
        { label: "Sector", value: p.sector },
        { label: "Sub-sector", value: p.subsector },
        { label: "Annual revenue", value: formatCurrency(p.annualRevenue) },
        { label: "GST number", value: p.gstNumber, copyable: true },
        { label: "CIN number", value: p.cinNumber, copyable: true },
        ...common,
      ];
    }
    case "CA":
      return [
        {
          label: "ICAI member number",
          value: (profile as CaProfileResponse).icaiMemberNumber,
          copyable: true,
        },
        ...common,
      ];
    case "CS": {
      const p = profile as CsProfileResponse;
      return [
        { label: "ICSI member number", value: p.icsiMemberNumber, copyable: true },
        { label: "Company name", value: p.companyName },
        ...common,
      ];
    }
    case "ESG_CONSULTANT": {
      const p = profile as EsgConsultantProfileResponse;
      return [
        { label: "Consultant ID", value: p.consultantId, copyable: true },
        { label: "FRM ID", value: p.frmId, copyable: true },
        { label: "Organisation", value: p.organizationName },
        { label: "Expertise area", value: p.expertiseArea },
        ...common,
      ];
    }
    case "ASSURER_AUDITOR": {
      const p = profile as AssurerAuditorProfileResponse;
      return [
        { label: "Accreditation number", value: p.accreditationNo, copyable: true },
        { label: "Organisation", value: p.organizationName },
        ...common,
      ];
    }
    default:
      return common;
  }
}

function computeCompleteness(profile: AnyProfile) {
  const fields = profileFields(profile);
  const filled = fields.filter((f) => hasValue(f.value)).length;
  const pct = fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;
  const missing = fields.filter((f) => !hasValue(f.value)).map((f) => f.label);
  return { pct, missing, filled, total: fields.length };
}

function credentialFields(profile: AnyProfile): ProfileField[] {
  return profileFields(profile).filter((f) =>
    ["Email", "Phone", "City", "State", "Country", "Pincode"].every((skip) => f.label !== skip),
  );
}

function locationFields(profile: AnyProfile): ProfileField[] {
  return profileFields(profile).filter((f) =>
    ["City", "State", "Country", "Pincode"].includes(f.label),
  );
}

/* ─────────────────────────── UI pieces ─────────────────────── */

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <button
      type="button"
      className={`profile-page__copy-btn${copied ? " profile-page__copy-btn--done" : ""}`}
      onClick={() => void handleCopy()}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      <i className={`ti ti-${copied ? "check" : "copy"}`} aria-hidden="true" />
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function InfoTile({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}) {
  const filled = hasValue(value);
  const display = displayValue(value);

  return (
    <div className={`profile-page__tile${filled ? "" : " profile-page__tile--empty"}`}>
      <CalculatorKpi label={label} value={display} />
      {copyable && filled && (
        <div className="profile-page__tile-actions">
          <CopyButton text={value!.trim()} label={label} />
        </div>
      )}
    </div>
  );
}

function ProfileToolbar({
  refreshing,
  onRefresh,
  onOpenSettings,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div className="profile-page__toolbar card card--elevated">
      <div className="profile-page__toolbar-text">
        <p className="profile-page__toolbar-eyebrow">Your account</p>
        <p className="profile-page__toolbar-desc">
          Review registration details synced from signup. Update phone and email in Settings.
        </p>
      </div>
      <div className="profile-page__toolbar-actions">
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <i className={`ti ti-refresh${refreshing ? " profile-page__spin" : ""}`} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        {onOpenSettings && (
          <button type="button" className="btn-primary btn-sm" onClick={onOpenSettings}>
            <i className="ti ti-settings" aria-hidden="true" />
            Account settings
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  refreshing,
  onRefresh,
  onOpenSettings,
}: {
  profile: AnyProfile;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSettings?: () => void;
}) {
  const { user, createdAt, updatedAt } = profile;
  const meta = ROLE_META[user.role];
  const since = useMemo(() => getSince(createdAt), [createdAt]);
  const fullName = `${capitalize(user.firstName)} ${capitalize(user.lastName)}`;
  const completeness = useMemo(() => computeCompleteness(profile), [profile]);
  const locationLine = formatLocation(user);
  const credentials = credentialFields(profile);
  const locations = locationFields(profile);

  return (
    <div className="profile-page">
      <ProfileToolbar
        refreshing={refreshing}
        onRefresh={onRefresh}
        onOpenSettings={onOpenSettings}
      />

      <section className="profile-page__hero card card--elevated">
        <div className="profile-page__hero-accent" aria-hidden="true" />
        <div className="profile-page__identity-main">
          <div className="profile-page__avatar">
            {user.profileImageUrl ? (
              <Image
                src={user.profileImageUrl}
                alt={fullName}
                fill
                className="profile-page__avatar-img"
              />
            ) : (
              <div className="profile-page__avatar-fallback" aria-hidden="true">
                {getInitials(user)}
              </div>
            )}
            {user.isVerified && (
              <span className="profile-page__verified" aria-label="Verified account">
                <i className="ti ti-badge-check" aria-hidden="true" />
              </span>
            )}
          </div>

          <div className="profile-page__identity-text">
            <p className="profile-page__eyebrow">{meta.label} profile</p>
            <h2 className="profile-page__name">{fullName}</h2>
            <div className="profile-page__badges">
              <span className="profile-page__badge">{meta.label}</span>
              {user.isVerified && (
                <span className="profile-page__badge profile-page__badge--verified">
                  <i className="ti ti-shield-check" aria-hidden="true" />
                  Verified
                </span>
              )}
              <span className="profile-page__badge profile-page__badge--muted">
                Member {since}
              </span>
            </div>
            {meta.blurb && <p className="profile-page__blurb">{meta.blurb}</p>}
          </div>
        </div>

        <div className="profile-page__contact-grid">
          <div className="profile-page__contact-card">
            <p className="profile-page__contact-label">Email</p>
            <div className="profile-page__contact-row">
              <span>{user.email}</span>
              <CopyButton text={user.email} label="email" />
            </div>
          </div>
          <div className="profile-page__contact-card">
            <p className="profile-page__contact-label">Phone</p>
            <div className="profile-page__contact-row">
              <span>{displayValue(user.phoneNo)}</span>
              {hasValue(user.phoneNo) && (
                <CopyButton text={user.phoneNo!.trim()} label="phone" />
              )}
            </div>
          </div>
          {locationLine && (
            <div className="profile-page__contact-card profile-page__contact-card--wide">
              <p className="profile-page__contact-label">Location</p>
              <p className="profile-page__location-line">{locationLine}</p>
            </div>
          )}
        </div>

        <div className="profile-page__stats">
          <div className="profile-page__stat">
            <span className="profile-page__stat-label">Joined</span>
            <span className="profile-page__stat-value">{formatProfileDate(createdAt)}</span>
          </div>
          <div className="profile-page__stat">
            <span className="profile-page__stat-label">Last updated</span>
            <span className="profile-page__stat-value">{formatProfileDate(updatedAt)}</span>
          </div>
          <div className="profile-page__stat profile-page__stat--grow">
            <div className="profile-page__stat-head">
              <span className="profile-page__stat-label">Profile completeness</span>
              <span className="profile-page__stat-value">{completeness.pct}%</span>
            </div>
            <div className="profile-page__progress" role="progressbar" aria-valuenow={completeness.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="profile-page__progress-fill" style={{ width: `${completeness.pct}%` }} />
            </div>
            <p className="profile-page__stat-hint">
              {completeness.pct === 100
                ? "All key profile fields are filled."
                : `${completeness.filled} of ${completeness.total} fields complete`}
            </p>
          </div>
        </div>
      </section>

      <div className="profile-page__sections">
        <CalculatorPanel
          title="Professional credentials"
          subtitle="Registration and role-specific identifiers"
        >
          <CalculatorKpiStrip>
            {credentials.map((field) => (
              <InfoTile
                key={field.label}
                label={field.label}
                value={field.value}
                copyable={field.copyable}
              />
            ))}
          </CalculatorKpiStrip>
        </CalculatorPanel>

        <CalculatorPanel title="Location details" subtitle="Address information from your account">
          <CalculatorKpiStrip>
            {locations.map((field) => (
              <InfoTile key={field.label} label={field.label} value={field.value} />
            ))}
          </CalculatorKpiStrip>
        </CalculatorPanel>
      </div>

      {completeness.missing.length > 0 && (
        <section className="profile-page__hint card card--elevated">
          <div className="profile-page__hint-icon" aria-hidden="true">
            <i className="ti ti-info-circle" />
          </div>
          <div>
            <p className="profile-page__hint-title">Complete your profile</p>
            <p className="dash-muted">
              Missing: {completeness.missing.slice(0, 4).join(", ")}
              {completeness.missing.length > 4
                ? ` and ${completeness.missing.length - 4} more`
                : ""}
              . Contact support if these were set during signup and still show as empty.
            </p>
          </div>
        </section>
      )}

      {onOpenSettings && (
        <section className="profile-page__cta card card--elevated">
          <div>
            <p className="profile-page__cta-title">Need to change contact details?</p>
            <p className="dash-muted">
              Phone, email, and password are managed in Account settings with OTP verification.
            </p>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={onOpenSettings}>
            Open settings
          </button>
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────── skeleton / error ───────────────── */

function SkeletonCard() {
  return (
    <div className="profile-page">
      <div className="profile-page__skeleton card card--elevated profile-page__skeleton--toolbar">
        <div className="profile-page__skeleton-line profile-page__skeleton-line--sm" />
        <div className="profile-page__skeleton-line" />
      </div>
      <div className="profile-page__skeleton card card--elevated profile-page__skeleton--hero">
        <div className="profile-page__skeleton-avatar" />
        <div className="profile-page__skeleton-lines">
          <div className="profile-page__skeleton-line profile-page__skeleton-line--lg" />
          <div className="profile-page__skeleton-line" />
          <div className="profile-page__skeleton-line profile-page__skeleton-line--sm" />
        </div>
      </div>
      <div className="profile-page__sections">
        <div className="profile-page__skeleton card card--elevated profile-page__skeleton--panel" />
        <div className="profile-page__skeleton card card--elevated profile-page__skeleton--panel" />
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="profile-page">
      <div className="card card--elevated profile-page__error">
        <div className="profile-page__error-icon" aria-hidden="true">
          <i className="ti ti-alert-circle" />
        </div>
        <p className="profile-page__error-title">Could not load profile</p>
        <p className="dash-muted">{message}</p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── export ────────────────────────── */

export default function ProfileDetails({
  role,
  prefetch,
  embedded = false,
  onOpenSettings,
}: ProfileDetailsProps) {
  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const isBackgroundRef = useRef(false);

  const handleRefresh = useCallback(() => {
    clearProfileCache(role);
    isBackgroundRef.current = false;
    setRefreshing(true);
    setRetryKey((v) => v + 1);
  }, [role]);

  useEffect(() => {
    let cancelled = false;

    const cached = readProfileCache(role);
    if (cached) {
      setProfile(cached);
      setLoading(false);
      isBackgroundRef.current = true;
    }

    async function loadProfile() {
      if (!isBackgroundRef.current) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }

      try {
        const endpoint = ROLE_META[role]?.endpoint;
        if (!endpoint) throw new Error("Invalid role");

        const res = await (prefetch ??
          fetchWithSession(
            endpoint,
            {
              method: "GET",
            },
            true,
            false,
          ));

        if (!res.ok) {
          let message = "Failed to load profile";
          try {
            const err = await res.json();
            if (err?.message) message = String(err.message);
          } catch {
            /* non-json error */
          }
          throw new Error(message);
        }

        const raw = await res.json();
        const data = raw as AnyProfile;
        if (!data?.user?.email) throw new Error("Invalid profile response from server");

        if (!cancelled) {
          setProfile(data);
          writeProfileCache(role, data);
        }
      } catch (err) {
        if (!cancelled && !isBackgroundRef.current) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          isBackgroundRef.current = false;
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [role, retryKey, prefetch]);

  return (
    <div className={embedded ? "profile-page-root" : "profile-page-root profile-page-root--standalone"}>
      {loading && <SkeletonCard />}
      {!loading && error && <ErrorCard message={error} onRetry={handleRefresh} />}
      {!loading && !error && profile && (
        <ProfileCard
          profile={profile}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  );
}
