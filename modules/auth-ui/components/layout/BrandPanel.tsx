export default function BrandPanel() {
  return (
    <div className="auth-brand-panel">
      <span className="auth-brand-panel__glow" aria-hidden />
      <div>
        <div className="auth-brand-panel__badge">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-400)] shadow-[0_0_8px_var(--brand-glow)]" />
          Portal login
        </div>
        <h1 className="auth-brand-panel__title">
          Welcome back to your ESG workspace.
        </h1>
        <p className="auth-brand-panel__copy">
          Log in to dashboards, reports, AI insights, and sustainability workflows built for Indian businesses.
        </p>
        <ul className="auth-brand-panel__points">
          <li>Assessments and BRSR reporting</li>
          <li>Calculators and client workspaces</li>
          <li>AI advisor for next actions</li>
        </ul>
      </div>
    </div>
  );
}
