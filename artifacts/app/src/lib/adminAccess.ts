/**
 * Single source of truth for the super-admin email.
 *
 * Super-admin access is granted unconditionally to this email regardless of
 * database state. All other access paths (profiles.role, user_roles table)
 * are additionally checked by the useAdmin hook.
 */
export const SUPER_ADMIN_EMAIL = "aktershun38@gmail.com";

/** @deprecated Use SUPER_ADMIN_EMAIL directly. Kept for compatibility. */
export const ADMIN_EMAILS = [SUPER_ADMIN_EMAIL];

/**
 * Returns true only for the super-admin email.
 * Used as a fast synchronous check — email is already present in the Supabase
 * user object, so no additional DB query is needed for this path.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "") === SUPER_ADMIN_EMAIL;
}
