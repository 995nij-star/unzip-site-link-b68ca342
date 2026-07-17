
-- =========================================================
-- 1. Fix SECURITY DEFINER view: profiles_public -> invoker
-- =========================================================
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- =========================================================
-- 2. profiles: restrict SELECT to signed-in users
--    (admins keep full access; app hooks continue to work)
-- =========================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- also ensure anon cannot read profiles via Data API
REVOKE SELECT ON public.profiles FROM anon;

-- =========================================================
-- 3. tournament_participants: hide PII from non-owners
-- =========================================================
DROP POLICY IF EXISTS "Users can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Owner or admin view participants"
  ON public.tournament_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_moderator(auth.uid()));

REVOKE SELECT ON public.tournament_participants FROM anon;

-- =========================================================
-- 4. payment_method_locks: restrict read to authenticated
-- =========================================================
DROP POLICY IF EXISTS "View pml" ON public.payment_method_locks;
CREATE POLICY "Authenticated view pml"
  ON public.payment_method_locks
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.payment_method_locks FROM anon;

-- =========================================================
-- 5. site_settings: only admins read direct table.
--    Public app must use site_settings_public view.
-- =========================================================
DROP POLICY IF EXISTS "Read site settings" ON public.site_settings;
CREATE POLICY "Admins read site settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE SELECT ON public.site_settings FROM anon;

-- Ensure anon can still read the safe view (used pre-login for theme/login_page)
GRANT SELECT ON public.site_settings_public TO anon, authenticated;

-- =========================================================
-- 6. conversation_participants: prevent joining others' DMs
-- =========================================================
DROP POLICY IF EXISTS "Add participants" ON public.conversation_participants;
CREATE POLICY "Users add themselves"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- admin read for moderation (AdminChats)
DROP POLICY IF EXISTS "Admins view participants" ON public.conversation_participants;
CREATE POLICY "Admins view participants"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()));

-- =========================================================
-- 7. Remove permissive true INSERT policies
-- =========================================================
DROP POLICY IF EXISTS "Create conversations" ON public.conversations;
CREATE POLICY "Auth users create conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone create tickets" ON public.support_tickets;
CREATE POLICY "Users create own tickets"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service insert login history" ON public.login_history;
CREATE POLICY "Service insert login history"
  ON public.login_history
  FOR INSERT
  TO service_role
  WITH CHECK (user_id IS NOT NULL);

-- =========================================================
-- 8. Wallet refund function: admin-only + validation
-- =========================================================
CREATE OR REPLACE FUNCTION public.wallet_refund_transfer(_amount numeric, _ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _target uuid;
  _held numeric;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.is_admin(_caller) THEN
    RAISE EXCEPTION 'only admins can issue wallet refunds';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  IF _ref IS NULL OR length(trim(_ref)) = 0 THEN
    RAISE EXCEPTION 'reference required';
  END IF;

  -- Find the original hold transaction; refund goes back to that user only,
  -- and only for the exact held amount, and only once.
  SELECT user_id, ABS(amount) INTO _target, _held
  FROM public.wallet_transactions
  WHERE type = 'admin_debit'
    AND description = 'Money transfer hold ' || _ref
  ORDER BY created_at DESC
  LIMIT 1;

  IF _target IS NULL THEN
    RAISE EXCEPTION 'no matching hold found for reference %', _ref;
  END IF;

  IF _held < _amount THEN
    RAISE EXCEPTION 'refund amount exceeds original hold';
  END IF;

  -- Prevent double refund
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE type = 'refund' AND description = 'Money transfer refund ' || _ref
  ) THEN
    RAISE EXCEPTION 'refund already issued for reference %', _ref;
  END IF;

  UPDATE public.wallets
    SET balance = balance + _amount, updated_at = now()
    WHERE user_id = _target;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (_target, _amount, 'refund', 'Money transfer refund ' || _ref);
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_refund_transfer(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_refund_transfer(numeric, text) TO authenticated;

-- =========================================================
-- 9. Revoke anon EXECUTE on internal SECURITY DEFINER RPCs
--    (they are only ever called from signed-in code paths)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.create_user_gift_code(numeric, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_gift_code(numeric, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_tournament(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_tournament(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.start_conversation(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_captcha_answer(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_captcha_answer(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.wallet_hold_transfer(numeric, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_hold_transfer(numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.generate_unique_uid() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_unique_uid() TO service_role;

-- Trigger-only helpers: strip all direct execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_wallet() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_uid_on_profile_create() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_super_admin_if_owner() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- =========================================================
-- 10. Ensure service_role can operate on public tables
--     (edge functions & admin flows)
-- =========================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.relname);
  END LOOP;
END $$;
