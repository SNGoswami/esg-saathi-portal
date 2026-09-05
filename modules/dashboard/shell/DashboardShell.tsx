"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import DashboardPageHeader from "@/modules/dashboard/components/DashboardPageHeader";
import { useMediaQuery } from "@/modules/dashboard/hooks/useMediaQuery";
import { resolveDashboardView } from "@/modules/dashboard/registry/viewRegistry";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { formatDisplayName } from "@/modules/platform/display/displayName";
import {
  NAV_BY_ROLE,
  ROLE_LABELS,
  viewDescription,
  isViewAllowedForRole,
  allViewsForRole,
  findNavItem,
  navHighlightView,
  type NavItem,
  type NavGroup,
} from "@/modules/dashboard/nav/dashboardNav";
import {
  buildAssessmentDashboardUrl,
  buildReportsDashboardUrl,
  buildWorkspaceHref,
  type AssessmentRouteParams,
  type ReportsRouteParams,
} from "@/modules/dashboard/nav/workspaceRoutes";
import { warmAdminCaches } from "@/modules/admin/api/adminPrefetch";
import { formatFiscalYearLabel, getCurrentFiscalYear } from "@/modules/platform/utils/fiscalYear";

const SIDEBAR_EXPANDED = 286;
const SIDEBAR_COLLAPSED = 62;

function filterNavGroups(groups: NavGroup[], query: string): NavGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        const haystack = [i.label, i.sidebarLabel].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      }),
    }))
    .filter((g) => g.items.length > 0);
}

function initialsFromName(name?: string) {
  if (!name) return "U";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ── Topbar ──────────────────────────────────────────────────── */

function Topbar({
  title,
  role,
  activeView,
  onNavLinkClick,
  onMobileMenuToggle,
  hideFiscalYear,
}: {
  title: string;
  role: string;
  activeView: string;
  onNavLinkClick: (view: string) => void;
  onMobileMenuToggle: () => void;
  hideFiscalYear?: boolean;
}) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  const topbarItems =
    role === "admin"
      ? []
      : (NAV_BY_ROLE[role] ?? [])
          .filter((g) => g.section === "Main" || g.section === "Overview")
          .flatMap((g) => g.items);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = formatDisplayName(user);
  const initials = initialsFromName(displayName);
  const fiscalYearLabel = formatFiscalYearLabel(getCurrentFiscalYear());

  return (
    <header className={`dash-topbar${userMenuOpen ? " dash-topbar--user-open" : ""}`}>
      {isMobile && (
        <button
          type="button"
          className="dash-icon-btn"
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <i className="ti ti-menu-2" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
      )}

      <Image
        src="/logoC.png"
        alt="ESGSaathi"
        width={172}
        height={56}
        priority
        className="dash-topbar__logo"
        style={{
          filter: isDark ? "brightness(1.3) saturate(1.2)" : "none",
        }}
      />

      {isMobile ? (
        <span className="dash-topbar__crumb">
          <span className="dash-topbar__crumb-sep" aria-hidden="true">
            /
          </span>
          <span className="dash-topbar__title-mobile">{title}</span>
        </span>
      ) : (
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
          / <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{title}</span>
        </span>
      )}

      {topbarItems.length > 0 ? (
        <nav className="dash-topbar__nav" aria-label="Quick navigation">
          {topbarItems.map((item: NavItem) => (
            <button
              key={item.view}
              type="button"
              className={`dash-nav-pill${activeView === item.view ? " dash-nav-pill--active" : ""}`}
              onClick={() => onNavLinkClick(item.view)}
            >
              <i className={`ti ti-${item.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      {!isMobile && <div className="dash-topbar__spacer" />}

      <div className="dash-topbar__controls">
        {!isMobile && !hideFiscalYear && (
          <div className="dash-chip" title="Current fiscal year">
            <i className="ti ti-calendar dash-chip__icon" aria-hidden="true" />
            <span className="dash-chip__label">{fiscalYearLabel}</span>
          </div>
        )}

        <DashThemeToggle />

        <div ref={userMenuRef} className="dash-topbar__user-menu">
          <button
            type="button"
            className="dash-avatar-btn"
            onClick={() => setUserMenuOpen((p) => !p)}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            aria-label={`Account menu for ${displayName}`}
          >
            {initials}
          </button>

          {userMenuOpen && (
            <div
              className={`dash-dropdown${isMobile ? " dash-dropdown--fixed" : ""}`}
              role="menu"
            >
              <div className="dash-dropdown__head">
                <p className="dash-dropdown__name">{displayName}</p>
                <p style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {ROLE_LABELS[role] ?? role}
                </p>
              </div>
              <button
                type="button"
                className="dash-dropdown__item"
                role="menuitem"
                onClick={() => { onNavLinkClick("profile"); setUserMenuOpen(false); }}
              >
                <i className="ti ti-user-circle" style={{ fontSize: 14 }} aria-hidden="true" />
                Profile
              </button>
              <button
                type="button"
                className="dash-dropdown__item"
                role="menuitem"
                onClick={() => { onNavLinkClick("settings"); setUserMenuOpen(false); }}
              >
                <i className="ti ti-settings" style={{ fontSize: 14 }} aria-hidden="true" />
                Settings
              </button>
              <button
                type="button"
                className="dash-dropdown__item dash-dropdown__item--danger"
                role="menuitem"
                onClick={() => { logout(); setUserMenuOpen(false); }}
              >
                <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────── */

function DashThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="dash-topbar-theme"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function Sidebar({
  role,
  activeView,
  onSelect,
  expanded,
  isMobile,
  onClose,
}: {
  role: string;
  activeView: string;
  onSelect: (view: string) => void;
  expanded: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const navGroups = useMemo(() => NAV_BY_ROLE[role] ?? [], [role]);
  const filtered = useMemo(() => filterNavGroups(navGroups, search), [navGroups, search]);
  const flatNav = useMemo(() => allViewsForRole(role), [role]);
  const displayName = formatDisplayName(user);
  const initials = initialsFromName(displayName);
  const collapsed = !expanded && !isMobile;

  const renderNavLink = (item: NavItem) => {
    const active = activeView === item.view;
    const sidebarText = item.sidebarLabel ?? item.label;
    return (
      <button
        key={item.view}
        type="button"
        title={collapsed ? sidebarText : undefined}
        aria-label={item.label}
        className={`dash-sidebar__link${active ? " dash-sidebar__link--active" : ""}`}
        onClick={() => { onSelect(item.view); if (isMobile) onClose(); }}
      >
        <i className={`ti ti-${item.icon} dash-sidebar__link-icon`} aria-hidden="true" />
        <span className="dash-sidebar__link-label">{sidebarText}</span>
        {item.badge && !collapsed && (
          <span className="dash-sidebar__link-badge">{item.badge}</span>
        )}
      </button>
    );
  };

  const panel = (
    <aside className={`dash-sidebar${collapsed ? " dash-sidebar--collapsed" : ""}`}>
      <div className="dash-sidebar__brand">
        <div className="dash-sidebar__brand-text">
          <p className="dash-sidebar__brand-label">Workspace</p>
          <p className="dash-sidebar__role-title">{ROLE_LABELS[role] ?? role}</p>
        </div>
      </div>

      <div className={`dash-sidebar__user${collapsed ? " dash-sidebar__user--collapsed" : ""}`}>
        <div className="dash-sidebar__avatar" title={displayName}>
          {initials}
        </div>
        {!collapsed && (
          <div className="dash-sidebar__user-text">
            <p className="dash-sidebar__fullname" title={displayName}>
              {displayName}
            </p>
            <p className="dash-sidebar__role">{user?.email ?? ""}</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <>

          <div className="dash-sidebar__search">
            <div className="dash-sidebar__search-wrap">
              <i className="ti ti-search dash-sidebar__search-icon" aria-hidden="true" />
              <input
                type="search"
                className="dash-sidebar__search-input"
                placeholder="Search menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search navigation"
              />
            </div>
          </div>
        </>
      )}

      <nav className="dash-sidebar__nav" aria-label="Dashboard navigation">
        {collapsed ? (
          <div className="dash-sidebar__nav-collapsed">
            {flatNav.map(renderNavLink)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="dash-sidebar__empty">No matches for &ldquo;{search}&rdquo;</p>
        ) : (
          filtered.map((group) => (
            <div key={group.section}>
              <p className="dash-sidebar__section">{group.section}</p>
              {group.items.map(renderNavLink)}
            </div>
          ))
        )}
      </nav>

      <div className="dash-sidebar__footer">
        <button type="button" className="dash-sidebar__logout" onClick={() => logout()} title="Sign out">
          <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
          <span className="dash-sidebar__logout-label">Sign out</span>
        </button>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {expanded && <div className="dash-drawer-backdrop" onClick={onClose} aria-hidden="true" />}
        <div className={`dash-drawer ${expanded ? "dash-drawer--open" : "dash-drawer--closed"}`}>
          {panel}
        </div>
      </>
    );
  }

  const width = expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  return (
    <div className="dash-sidebar-area" style={{ width, minWidth: width }}>
      <div className="dash-sidebar-wrap" style={{ width, minWidth: width }}>
        {panel}
      </div>
    </div>
  );
}

function SidebarToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="dash-sidebar-toggle"
      onClick={onToggle}
      aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
    >
      <i className={`ti ti-chevron-${expanded ? "left" : "right"}`} style={{ fontSize: 14 }} aria-hidden="true" />
    </button>
  );
}

/* ── Shell ───────────────────────────────────────────────────── */

export default function DashboardShell({ initialView = "dashboard" }: { initialView?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const role = normalizeRole(user?.role);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const safeInitial =
    initialView && isViewAllowedForRole(role, initialView) ? initialView : "dashboard";

  const [activeView, setActiveView] = useState(safeInitial);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const drawerOpen = isMobile && mobileOpen;

  const resolvedView = isViewAllowedForRole(role, activeView) ? activeView : "dashboard";

  useEffect(() => {
    if (resolvedView !== activeView) {
      queueMicrotask(() => {
        setActiveView("dashboard");
        router.replace(buildWorkspaceHref(role), { scroll: false });
      });
    }
  }, [resolvedView, activeView, router, role]);

  useEffect(() => {
    if (role === "admin") {
      void warmAdminCaches();
    }
  }, [role]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeView]);

  const syncUrl = useCallback(
    (view: string) => {
      router.replace(buildWorkspaceHref(role, view), { scroll: false });
    },
    [router, role],
  );

  const handleSelect = useCallback(
    (view: string) => {
      setActiveView(view);
      setMobileOpen(false);
      syncUrl(view);
    },
    [syncUrl, setActiveView, setMobileOpen],
  );

  const handleNavigateToReport = useCallback(
    (category: string, reportId: string, extra?: Pick<ReportsRouteParams, "clientId">) => {
      setActiveView("reports");
      setMobileOpen(false);
      router.replace(buildReportsDashboardUrl({ category, reportId, clientId: extra?.clientId }), {
        scroll: false,
      });
    },
    [router, setActiveView, setMobileOpen],
  );

  const handleNavigateToAssessment = useCallback(
    (params?: AssessmentRouteParams) => {
      setActiveView("assessment");
      setMobileOpen(false);
      router.replace(buildAssessmentDashboardUrl(params), { scroll: false });
    },
    [router, setActiveView, setMobileOpen],
  );

  const allItems = (NAV_BY_ROLE[role] ?? []).flatMap((g) => g.items);
  const activeItem = allItems.find((i: NavItem) => i.view === resolvedView) ?? findNavItem(role, resolvedView);
  const pageTitle = activeItem?.label ?? "Dashboard";
  const topbarTitle =
    isMobile && activeItem?.sidebarLabel ? activeItem.sidebarLabel : pageTitle;
  const showPageHeader = role !== "admin" && resolvedView !== "dashboard";
  const highlightView = navHighlightView(role, resolvedView);

  return (
    <div className={`dash-shell${isMobile ? " dash-shell--mobile" : ""}${role === "admin" ? " dash-shell--admin" : ""}`}>
      <Topbar
        title={topbarTitle}
        role={role}
        activeView={highlightView}
        onNavLinkClick={handleSelect}
        onMobileMenuToggle={() => setMobileOpen(true)}
        hideFiscalYear={role === "admin"}
      />

      <div className="dash-body">
        {!isMobile ? (
          <div style={{ position: "relative", height: "100%", flexShrink: 0 }}>
            <Sidebar
              role={role}
              activeView={highlightView}
              onSelect={handleSelect}
              expanded={sidebarExpanded}
              isMobile={false}
              onClose={() => {}}
            />
            <SidebarToggle
              expanded={sidebarExpanded}
              onToggle={() => setSidebarExpanded((p) => !p)}
            />
          </div>
        ) : (
          <Sidebar
            role={role}
            activeView={highlightView}
            onSelect={handleSelect}
            expanded={drawerOpen}
            isMobile
            onClose={() => setMobileOpen(false)}
          />
        )}

        <main ref={mainRef} className="dash-main">
          <div className="dash-main__inner">
            {showPageHeader && (
              <DashboardPageHeader
                title={pageTitle}
                description={viewDescription(resolvedView, role)}
                roleLabel={ROLE_LABELS[role]}
                compactMobile={isMobile}
                className={resolvedView === "faq" ? "dash-page-header--faq" : undefined}
              />
            )}
            <div className="dash-content">
              {resolveDashboardView(
                role,
                resolvedView,
                activeItem?.icon,
                handleSelect,
                handleNavigateToReport,
                handleNavigateToAssessment,
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
