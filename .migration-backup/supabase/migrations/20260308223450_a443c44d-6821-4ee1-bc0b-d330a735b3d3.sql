
-- ============================================
-- 1. FIX: Tournament room credentials exposure
-- ============================================

-- Remove overly permissive INSERT on tournaments for {public}
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.tournaments;

-- Only admins/mods can create tournaments
CREATE POLICY "Admins can create tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Recreate tournaments_safe view with proper credential masking
DROP VIEW IF EXISTS public.tournaments_safe; -- @allow-destructive (historical view recreation)
CREATE VIEW public.tournaments_safe
WITH (security_invoker = on) AS
SELECT
  id, title, description, game, entry_fee, prize_pool,
  max_players, current_players, start_time, status,
  created_at, updated_at, image_url,
  CASE
    WHEN (
      auth.uid() IN (
        SELECT tp.user_id FROM public.tournament_participants tp
        WHERE tp.tournament_id = tournaments.id
      )
      OR is_admin(auth.uid())
    ) THEN room_id
    ELSE NULL
  END AS room_id,
  CASE
    WHEN (
      auth.uid() IN (
        SELECT tp.user_id FROM public.tournament_participants tp
        WHERE tp.tournament_id = tournaments.id
      )
      OR is_admin(auth.uid())
    ) THEN room_password
    ELSE NULL
  END AS room_password
FROM public.tournaments;

GRANT SELECT ON public.tournaments_safe TO authenticated;
GRANT SELECT ON public.tournaments_safe TO anon;

-- ============================================
-- 2. FIX: Profile PII - recreate public view without sensitive fields
-- ============================================
DROP VIEW IF EXISTS public.profiles_public; -- @allow-destructive (historical view recreation)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id, user_id, username, avatar_url, uid,
  is_verified, verified_at, created_at, updated_at, last_seen
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- ============================================
-- 3. FIX: Wallet arbitrary balance on INSERT
-- ============================================

-- Remove user-level INSERT - wallets are provisioned by handle_new_user_wallet trigger
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;

-- ============================================
-- 4. FIX: wallet_transactions - remove any user INSERT policies
-- ============================================
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

-- ============================================
-- 5. FIX: support_tickets permissive INSERT (WITH CHECK true)
-- ============================================
DROP POLICY IF EXISTS "Anyone can create support tickets" ON public.support_tickets;

CREATE POLICY "Authenticated users can create support tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- 6. FIX: Player leaderboard - remove total_earnings exposure
-- ============================================
DROP VIEW IF EXISTS public.player_leaderboard; -- @allow-destructive (historical view recreation)
CREATE VIEW public.player_leaderboard
WITH (security_invoker = on) AS
SELECT
  p.user_id,
  p.username,
  p.avatar_url,
  p.uid,
  COALESCE(COUNT(DISTINCT tp.tournament_id), 0) AS tournaments_played,
  0::bigint AS wins,
  COALESCE(likes.like_count, 0) AS likes_count
FROM public.profiles p
LEFT JOIN public.tournament_participants tp ON p.user_id = tp.user_id
LEFT JOIN (
  SELECT profile_user_id, COUNT(*) AS like_count
  FROM public.profile_likes
  GROUP BY profile_user_id
) likes ON p.user_id = likes.profile_user_id
GROUP BY p.user_id, p.username, p.avatar_url, p.uid, likes.like_count
ORDER BY COALESCE(COUNT(DISTINCT tp.tournament_id), 0) DESC;

GRANT SELECT ON public.player_leaderboard TO authenticated;
GRANT SELECT ON public.player_leaderboard TO anon;
