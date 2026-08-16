"use client";

/**
 * /user/profile, redirects into the dashboard shell with the profile view active.
 * The old standalone page (with its own Navbar + Footer) is replaced by the
 * dashboard shell so profile uses the same layout as every other dashboard view.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Replace history entry so the back button doesn't loop
    router.replace("/user/dashboard?view=profile");
  }, [router]);

  return null;
}
