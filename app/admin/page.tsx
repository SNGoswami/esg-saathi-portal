import { redirect } from "next/navigation";

/** Legacy /admin, unified admin lives in the dashboard shell. */
export default function AdminRedirectPage() {
  redirect("/user/dashboard");
}
