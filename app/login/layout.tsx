import { AuthProvider } from "@/modules/platform/auth/AuthContext";

/** Never hydrate from server cookies on /login — avoids reauth ↔ dashboard loops. */
export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider initialUser={null}>{children}</AuthProvider>;
}
