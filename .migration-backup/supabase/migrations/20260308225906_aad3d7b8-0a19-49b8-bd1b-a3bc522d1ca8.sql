
-- 1. FIX: Remove old public tournament SELECT policy that exposes room credentials to anon
DROP POLICY IF EXISTS "Authenticated users can view tournaments via safe view" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated can view tournaments via safe view" ON public.tournaments;

-- 2. FIX: Remove stale profiles policy if it still exists
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles for system features" ON public.profiles;

-- 3. FIX: tournaments_safe view - use security_invoker and remove raw credentials
DROP VIEW IF EXISTS public.tournaments_safe; -- @allow-destructive (historical view recreation)
CREATE VIEW public.tournaments_safe WITH (security_invoker = true) AS
SELECT
  id, title, description, game, status, entry_fee, prize_pool,
  max_players, current_players, start_time, image_url,
  created_at, updated_at,
  CASE WHEN is_admin(auth.uid()) THEN room_id
       WHEN auth.uid() IN (SELECT user_id FROM tournament_participants WHERE tournament_id = tournaments.id) THEN room_id
       ELSE NULL END AS room_id,
  CASE WHEN is_admin(auth.uid()) THEN room_password
       WHEN auth.uid() IN (SELECT user_id FROM tournament_participants WHERE tournament_id = tournaments.id) THEN room_password
       ELSE NULL END AS room_password
FROM public.tournaments;
