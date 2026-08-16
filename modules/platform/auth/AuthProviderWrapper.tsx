import { getServerAuthUser } from "@/modules/platform/auth/serverAuth";
import { AuthProvider } from "@/modules/platform/auth/AuthContext";

export default async function AuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getServerAuthUser();
  return <AuthProvider initialUser={initialUser}>{children}</AuthProvider>;
}
