import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/modules/platform/auth/serverAuth";

export default async function PortalHome() {
  const user = await getServerAuthUser();
  redirect(user ? "/user/dashboard" : "/login");
}
