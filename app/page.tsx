import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/modules/platform/auth/serverAuth";
import { getPostLoginPath } from "@/modules/platform/rbac/roles";

export default async function PortalHome() {
  const user = await getServerAuthUser();
  redirect(user ? getPostLoginPath(user.role) : "/login");
}
