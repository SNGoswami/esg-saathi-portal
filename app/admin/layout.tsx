import AuthProviderWrapper from "@/modules/platform/auth/AuthProviderWrapper";
import SessionProvider from "@/app/providers/SessionProvider";
import AppShellMarker from "@/modules/platform/feedback/AppShellMarker";
import "../dashboard.css";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppShellMarker variant="dashboard" />
      <AuthProviderWrapper>
        <SessionProvider>{children}</SessionProvider>
      </AuthProviderWrapper>
    </>
  );
}
