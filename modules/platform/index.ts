/** Client-safe platform exports only. Server auth: import `@/modules/platform/auth/serverAuth` directly. */
export { apiFetch } from "./api/client";
export { API_URL } from "./api/constants";
export { AuthProvider, useAuth, type AuthUser } from "./auth/AuthContext";
export { normalizeRole, getPostLoginPath, type RoleKey } from "./rbac/roles";
export { formatDisplayName, splitDisplayName } from "./display/displayName";
