"use client";

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  roleLabel?: string;
  className?: string;
  /** Hides duplicate title on mobile when the topbar already shows it. */
  compactMobile?: boolean;
  children?: React.ReactNode;
}

export default function DashboardPageHeader({
  title,
  description,
  roleLabel,
  className,
  compactMobile = false,
  children,
}: DashboardPageHeaderProps) {
  return (
    <header
      className={`dash-page-header${compactMobile ? " dash-page-header--mobile-compact" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <div className="dash-page-header__text">
        <div className="dash-page-header__title-row">
          <h1 className="dash-page-header__title">{title}</h1>
          {roleLabel && (
            <span className="dash-role-pill">{roleLabel}</span>
          )}
        </div>
        {description && (
          <p className="dash-page-header__desc">{description}</p>
        )}
      </div>
      {children && <div className="dash-page-header__actions">{children}</div>}
    </header>
  );
}
