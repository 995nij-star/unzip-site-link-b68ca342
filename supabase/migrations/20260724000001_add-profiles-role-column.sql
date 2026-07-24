-- ============================================================
-- Add role column to profiles table
-- ============================================================
-- This migration adds a `role` column to the `profiles` table so that
-- authorization can be checked directly on the profile record in addition
-- to the separate `user_roles` junction table.
--
-- All existing accounts default to 'user'.
-- Only the super-admin account should ever have 'admin' or 'super_admin'.
-- Role elevation is done exclusively via the API server's /api/admin/bootstrap
-- endpoint, which is itself restricted to the super-admin email address.
-- ============================================================

-- Add role column using the existing app_role enum.
-- IF NOT EXISTS guard makes this migration safe to re-run.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'user';

-- Index for role-based lookups (e.g. admin queries filtering by role)
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.role IS
  'User role: user (default), moderator, admin, super_admin. '
  'Elevation to admin/super_admin is restricted to the super-admin account '
  'via the API server bootstrap endpoint.';
