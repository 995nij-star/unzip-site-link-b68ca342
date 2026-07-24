/**
 * AdminBootstrap — DISABLED
 *
 * This component previously allowed any admin-email user to self-bootstrap
 * their admin role via the API. It has been removed from the admin dashboard
 * to prevent accidental or malicious misuse.
 *
 * The bootstrap API endpoint still exists but is now restricted to the
 * super-admin email on the server side (403 for everyone else).
 *
 * If the super-admin account ever loses its DB role, the bootstrap can be
 * triggered directly via:
 *   curl -X POST /api/admin/bootstrap \
 *        -H "Authorization: Bearer <supabase-access-token>"
 *
 * This file is intentionally a no-op export to avoid breaking any stale
 * imports during the transition.
 */
export function AdminBootstrap() {
  return null;
}
