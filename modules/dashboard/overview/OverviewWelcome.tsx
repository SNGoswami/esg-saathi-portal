"use client";

export default function OverviewWelcome({
  subtitle,
  children,
}: {
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card card--elevated overview-welcome">
      <p className="overview-welcome__eyebrow">Welcome back</p>
      <p className="overview-welcome__title">{subtitle}</p>
      {children}
    </div>
  );
}
