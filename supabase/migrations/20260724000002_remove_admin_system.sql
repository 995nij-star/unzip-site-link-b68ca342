-- ============================================================
-- Remove Admin System
-- Drops all admin-related tables, functions, policies, and types.
-- User-facing features (auth, wallets, profiles, etc.) are preserved.
-- ============================================================

-- ============================================================
-- 1. Fix mixed policies: drop admin+owner versions, recreate owner-only
-- ============================================================

-- tournament_participants: was "user_id = auth.uid() OR is_admin_or_moderator(auth.uid())"
-- Recreate as owner-only so regular users can still see their own registrations.
DROP POLICY IF EXISTS "Owner or admin view participants" ON public.tournament_participants;
CREATE POLICY "Owner view participants"
  ON public.tournament_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. Recreate tournaments_safe view without admin function references
-- ============================================================
CREATE OR REPLACE VIEW public.tournaments_safe WITH (security_invoker = true) AS
SELECT
  id, title, description, game, entry_fee, prize_pool,
  max_players, current_players, start_time, status,
  created_at, updated_at, image_url,
  CASE
    WHEN auth.uid() IN (SELECT user_id FROM public.tournament_participants WHERE tournament_id = tournaments.id)
    THEN room_id
    ELSE NULL
  END AS room_id,
  CASE
    WHEN auth.uid() IN (SELECT user_id FROM public.tournament_participants WHERE tournament_id = tournaments.id)
    THEN room_password
    ELSE NULL
  END AS room_password
FROM public.tournaments;

-- ============================================================
-- 3. Drop the role column from profiles (uses app_role enum)
--    Must be dropped before we can drop the enum.
-- ============================================================
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ============================================================
-- 4. Drop all RLS policies that reference admin functions.
--    After step 1, all remaining admin-function references are
--    pure admin-only policies — no mixed owner+admin policies remain.
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual::text ILIKE '%is_admin%'
        OR qual::text ILIKE '%is_admin_or_moderator%'
        OR qual::text ILIKE '%has_role%'
        OR with_check::text ILIKE '%is_admin%'
        OR with_check::text ILIKE '%is_admin_or_moderator%'
        OR with_check::text ILIKE '%has_role%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 5. Drop admin-specific tables (CASCADE removes their own policies/indexes)
-- ============================================================
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.moderator_permissions CASCADE;
DROP TABLE IF EXISTS public.mod_applications CASCADE;

-- ============================================================
-- 6. Drop admin functions (explicit signatures to avoid ambiguity)
-- ============================================================
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_moderator(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- ============================================================
-- 7. Drop the app_role enum
--    Safe: profiles.role was dropped in step 3;
--    user_roles / moderator_permissions dropped in step 5;
--    has_role dropped in step 6.
--    No remaining dependents, no CASCADE surprises.
-- ============================================================
DROP TYPE IF EXISTS public.app_role;
