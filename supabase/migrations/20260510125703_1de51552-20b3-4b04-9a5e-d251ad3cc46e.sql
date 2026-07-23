-- =========================================================
-- 1) Storage: drop broad SELECT policies on public buckets
-- =========================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view site assets"           ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view clips storage"         ON storage.objects;
DROP POLICY IF EXISTS "Anyone can download APK files"         ON storage.objects;

-- =========================================================
-- 2) SECURITY DEFINER functions: tighten EXECUTE
-- =========================================================

-- 2a) Trigger-only / internal functions: no API callers, revoke from PUBLIC entirely
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.assign_uid_on_profile_create()',
    'public.calculate_trust_score(uuid)',
    'public.generate_clip_short_code()',
    'public.generate_unique_uid()',
    'public.handle_new_user()',
    'public.handle_new_user_wallet()',
    'public.notify_all_users_announcement()',
    'public.notify_followers_new_clip()',
    'public.notify_new_follower()',
    'public.notify_new_message()',
    'public.notify_profile_like()',
    'public.notify_room_credentials()',
    'public.notify_ticket_response()',
    'public.notify_topup_status()',
    'public.notify_tournament_participants(uuid, text, text, text)',
    'public.notify_withdrawal_status()',
    'public.protect_profile_fields()',
    'public.update_updated_at_column()'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 2b) Client RPCs: revoke from anon (require sign-in), keep authenticated
REVOKE EXECUTE ON FUNCTION public.create_user_gift_code(numeric, integer)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_code(text)                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_tournament(uuid, text, text, text)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_conversation(uuid)                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_captcha_answer(uuid, text)               FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_user_gift_code(numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_tournament(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_captcha_answer(uuid, text)       TO authenticated;

-- 2c) RLS helper functions used inside policies on publicly readable tables.
--     They must remain callable by both anon and authenticated for those policies to evaluate.
--     Re-grant explicitly so the intent is documented.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid)                           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid)    TO anon, authenticated;