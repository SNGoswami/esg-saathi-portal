import { Suspense } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthShell from "@/modules/auth-ui/components/layout/AuthShell";
import { getServerAuthUser } from "@/modules/platform/auth/serverAuth";
import { getPostLoginPath } from "@/modules/platform/rbac/roles";

export const metadata = { title: "Log in | ESGSaathi Portal" };

type LoginPageProps = {
  searchParams: Promise<{
    reauth?: string;
    signed_out?: string;
    redirect?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const signedOut = params.signed_out === "1";

  if (!signedOut && !params.redirect) {
    const user = await getServerAuthUser();
    if (user) {
      redirect(getPostLoginPath(user.role, params.redirect));
    }
  }

  return (
    <div className="page-shell auth-page">
      <Navbar />

      <main className="page-main">
        <div className="page-band">
          <Suspense fallback={<div className="auth-shell"><p className="text-sm text-[var(--color-text-muted)]">Loading…</p></div>}>
            <AuthShell />
          </Suspense>
        </div>

        <Footer />
      </main>
    </div>
  );
}
