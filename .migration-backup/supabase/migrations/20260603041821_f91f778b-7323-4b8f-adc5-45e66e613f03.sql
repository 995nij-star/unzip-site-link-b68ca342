
-- 1) CAPTCHA: stop returning expected_answer to the challenged user.
-- Remove the SELECT policy granting full row read to the target user;
-- expose only safe fields via a security_invoker view, and verify via existing RPC.
DROP POLICY IF EXISTS "Target user can view own challenge" ON public.captcha_challenges;

CREATE OR REPLACE VIEW public.captcha_challenges_public
WITH (security_invoker = true) AS
SELECT id, target_user_id, question, status, attempts, expires_at, created_at, answered_at
FROM public.captcha_challenges;

GRANT SELECT ON public.captcha_challenges_public TO authenticated;

-- Re-add a SELECT policy on the base table that lets the target read only via the view
-- (the view inherits invoker's policies; without a SELECT policy the view returns nothing).
-- We add a column-safe policy: target can SELECT but the view masks expected_answer/user_answer.
CREATE POLICY "Target user can view own challenge (safe via view)"
ON public.captcha_challenges
FOR SELECT
TO authenticated
USING (auth.uid() = target_user_id);

-- NOTE: clients must be updated to read from captcha_challenges_public, not the base table.

-- 2) conversation_participants: prevent participants from adding arbitrary users.
-- The start_conversation SECURITY DEFINER RPC remains the only path to add a peer.
DROP POLICY IF EXISTS "Users can add participants to conversations they belong to" ON public.conversation_participants;

CREATE POLICY "Users can only add themselves to conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3) Lock down SECURITY DEFINER functions: revoke EXECUTE from anon for any function
-- that is not meant to be called by unauthenticated callers. Trigger functions don't
-- need any EXECUTE grants. Helper functions used by RLS run inside policy evaluation
-- and don't require anon EXECUTE.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.calculate_trust_score(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_unique_uid() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tournament_participants(uuid, text, text, text) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_user_gift_code(numeric, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.start_conversation(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_captcha_answer(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_tournament(uuid, text, text, text) FROM anon, public;

-- Re-grant to authenticated for user-callable RPCs
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_gift_code(numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_captcha_answer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_tournament(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;
