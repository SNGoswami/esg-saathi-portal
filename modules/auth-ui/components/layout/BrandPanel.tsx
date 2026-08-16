export default function BrandPanel() {
  return (
    <div className="auth-brand-panel relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium tracking-wide">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-500)] shadow-[0_0_8px_var(--brand-glow)]" />
          ESGSaathi Secure Access
        </div>

        <h1 className="mt-8 text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
          ESG readiness
          <br />
          for modern
          <br />
          Indian MSMEs.
        </h1>

        <p className="mt-6 max-w-md text-sm leading-7 text-white/75">
          Access your ESG dashboard, reports, AI insights and sustainability workflows.
        </p>
      </div>

      <p className="text-xs text-white/50">© 2026 ESGSaathi</p>
    </div>
  );
}
