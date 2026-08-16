/** Build a display name from auth / profile API fields. */
export function formatDisplayName(
  user?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
): string {
  if (!user) return "User";

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first || last) {
    return [first, last].filter(Boolean).join(" ");
  }

  const raw = user.name?.trim();
  if (raw) {
    const cleaned = raw
      .split(/\s+/)
      .filter((part) => part && part.toLowerCase() !== "null")
      .join(" ");
    if (cleaned) return cleaned;
  }

  return user.email?.trim() || "User";
}

/** First and last name for sidebar (splits combined `name` when needed). */
export function splitDisplayName(
  user?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
): { firstName: string; lastName: string } {
  if (!user) return { firstName: "User", lastName: "" };

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first || last) {
    return { firstName: first || "User", lastName: last || "" };
  }

  const parts = formatDisplayName(user).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "User", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
