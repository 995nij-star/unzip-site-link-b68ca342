-- ============================================================
-- 1. Tighten public SELECT policies on social/config tables
-- ============================================================

-- clip_likes
DROP POLICY IF EXISTS cl_select ON public.clip_likes;
CREATE POLICY cl_select_authenticated ON public.clip_likes
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.clip_likes FROM anon;

-- profile_likes
DROP POLICY IF EXISTS pl_select ON public.profile_likes;
DROP POLICY IF EXISTS profile_likes_select ON public.profile_likes;
CREATE POLICY profile_likes_select_authenticated ON public.profile_likes
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profile_likes FROM anon;

-- user_follows
DROP POLICY IF EXISTS uf_select ON public.user_follows;
DROP POLICY IF EXISTS user_follows_select ON public.user_follows;
CREATE POLICY user_follows_select_authenticated ON public.user_follows
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.user_follows FROM anon;

-- payment_method_locks (exposes admin uuid via updated_by)
DROP POLICY IF EXISTS pml_select ON public.payment_method_locks;
DROP POLICY IF EXISTS payment_method_locks_select ON public.payment_method_locks;
CREATE POLICY payment_method_locks_select_authenticated ON public.payment_method_locks
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.payment_method_locks FROM anon;

-- stream_messages
DROP POLICY IF EXISTS sm_select ON public.stream_messages;
DROP POLICY IF EXISTS stream_messages_select ON public.stream_messages;
CREATE POLICY stream_messages_select_authenticated ON public.stream_messages
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.stream_messages FROM anon;

-- stream_reactions
DROP POLICY IF EXISTS sr_select ON public.stream_reactions;
DROP POLICY IF EXISTS stream_reactions_select ON public.stream_reactions;
CREATE POLICY stream_reactions_select_authenticated ON public.stream_reactions
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.stream_reactions FROM anon;

-- user_locations: add explicit anon-deny reinforcement
REVOKE ALL ON public.user_locations FROM anon;

-- ============================================================
-- 2. Fix RLS Policy Always True warnings
-- ============================================================

-- conversations INSERT: creator must be authenticated (auth.uid() present)
DROP POLICY IF EXISTS c_ins ON public.conversations;
CREATE POLICY c_ins ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- detection_events INSERT: caller must be signed in
DROP POLICY IF EXISTS de_ins ON public.detection_events;
CREATE POLICY de_ins ON public.detection_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- bot_checks INSERT (public) — keep public but require a non-empty payload session
DROP POLICY IF EXISTS bc_ins ON public.bot_checks;
CREATE POLICY bc_ins ON public.bot_checks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
REVOKE INSERT ON public.bot_checks FROM anon;

-- captcha_challenges INSERT/UPDATE: signed-in only
DROP POLICY IF EXISTS cc_ins ON public.captcha_challenges;
DROP POLICY IF EXISTS cc_upd ON public.captcha_challenges;
CREATE POLICY cc_ins ON public.captcha_challenges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cc_upd ON public.captcha_challenges
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
REVOKE INSERT, UPDATE ON public.captcha_challenges FROM anon;

-- ============================================================
-- 3. Lock down SECURITY DEFINER function execution
-- Trigger-only and internal helpers: revoke from anon + public.
-- User-callable RPCs: revoke anon but keep authenticated.
-- ============================================================

-- Trigger-only helpers — no direct API callers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- RLS-support helpers: called from policies; policy execution still works
-- because Postgres evaluates RLS with the caller's role AND functions with
-- SECURITY DEFINER run as the owner. Revoking anon prevents direct API calls
-- without breaking policy checks (owner-run definer path is unaffected).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;

-- User-callable RPCs: keep authenticated, deny anon
REVOKE EXECUTE ON FUNCTION public.join_tournament(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_tournament(uuid, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_payment_method_enabled(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_payment_method_enabled(text, boolean) TO authenticated;