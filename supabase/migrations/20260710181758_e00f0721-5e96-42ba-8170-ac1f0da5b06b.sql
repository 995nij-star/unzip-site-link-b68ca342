-- Missing profile column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_premium FROM public.profiles WHERE user_id = _user_id), false)
$$;

-- Gift codes (should have been in batch1)
CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expiry timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gift codes" ON public.gift_codes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users view own gift codes" ON public.gift_codes FOR SELECT TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.gift_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gift_code_id uuid NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, gift_code_id)
);
GRANT SELECT, INSERT ON public.gift_code_redemptions TO authenticated;
GRANT ALL ON public.gift_code_redemptions TO service_role;
ALTER TABLE public.gift_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own redemption" ON public.gift_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Gift-code RPCs
CREATE OR REPLACE FUNCTION public.create_user_gift_code(p_amount numeric, p_max_uses integer DEFAULT 1)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_balance numeric; v_code text; v_exists boolean; v_total numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_amount < 10 THEN RETURN json_build_object('success', false, 'error', 'Minimum amount is 10'); END IF;
  IF p_max_uses < 1 OR p_max_uses > 100 THEN RETURN json_build_object('success', false, 'error', 'Max uses 1-100'); END IF;
  v_total := p_amount * p_max_uses;
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id;
  IF v_balance IS NULL OR v_balance < v_total THEN RETURN json_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  LOOP
    v_code := 'GC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.gift_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  UPDATE public.wallets SET balance = balance - v_total, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description) VALUES (v_user_id, -v_total, 'gift_code', 'Created gift code ' || v_code);
  INSERT INTO public.gift_codes (code, amount, max_uses, expiry, created_by) VALUES (v_code, p_amount, p_max_uses, now() + interval '30 days', v_user_id);
  RETURN json_build_object('success', true, 'code', v_code, 'amount', p_amount);
END $$;

CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_gc gift_codes%ROWTYPE; v_dup boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_gc FROM public.gift_codes WHERE code = p_code FOR UPDATE;
  IF v_gc IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid code'); END IF;
  IF NOT v_gc.is_active OR v_gc.expiry < now() THEN RETURN json_build_object('success', false, 'error', 'Expired'); END IF;
  IF v_gc.used_count >= v_gc.max_uses THEN RETURN json_build_object('success', false, 'error', 'Fully redeemed'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.gift_code_redemptions WHERE gift_code_id = v_gc.id AND user_id = v_user_id) INTO v_dup;
  IF v_dup THEN RETURN json_build_object('success', false, 'error', 'Already redeemed'); END IF;
  INSERT INTO public.gift_code_redemptions (user_id, gift_code_id) VALUES (v_user_id, v_gc.id);
  UPDATE public.gift_codes SET used_count = used_count + 1 WHERE id = v_gc.id;
  UPDATE public.wallets SET balance = balance + v_gc.amount, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description) VALUES (v_user_id, v_gc.amount, 'gift_code', 'Redeemed ' || v_gc.code);
  RETURN json_build_object('success', true, 'amount', v_gc.amount);
END $$;

-- User reports (referenced by trust_score fn)
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report user" ON public.user_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins view reports" ON public.user_reports FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins update reports" ON public.user_reports FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins delete reports" ON public.user_reports FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Website content
CREATE TABLE public.website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (page_key, section_key)
);
GRANT SELECT ON public.website_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.website_content TO authenticated;
GRANT ALL ON public.website_content TO service_role;
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read website content" ON public.website_content FOR SELECT USING (true);
CREATE POLICY "Admins manage website content" ON public.website_content FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Fraud alerts
CREATE TABLE public.fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL,
  affected_user_ids text[] DEFAULT '{}',
  device_id text,
  ip_address text,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fraud_alerts TO authenticated;
GRANT ALL ON public.fraud_alerts TO service_role;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fraud" ON public.fraud_alerts FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Account locks
CREATE TABLE public.account_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  is_locked boolean NOT NULL DEFAULT true,
  locked_by uuid,
  lock_reason text,
  auto_locked boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz NOT NULL DEFAULT now(),
  unlocked_at timestamptz,
  unlocked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_locks TO authenticated;
GRANT ALL ON public.account_locks TO service_role;
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage locks" ON public.account_locks FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Bot checks + captcha
CREATE TABLE public.bot_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('human','bot','inconclusive')),
  confidence integer NOT NULL DEFAULT 0,
  signal_score integer NOT NULL DEFAULT 0,
  ai_verdict text,
  ai_reasoning text,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  captcha_challenge_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_checks TO authenticated;
GRANT ALL ON public.bot_checks TO service_role;
ALTER TABLE public.bot_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins bot checks" ON public.bot_checks FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.captcha_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  question text NOT NULL,
  expected_answer text NOT NULL,
  user_answer text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captcha_challenges TO authenticated;
GRANT ALL ON public.captcha_challenges TO service_role;
ALTER TABLE public.captcha_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage captcha" ON public.captcha_challenges FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Target view own captcha" ON public.captcha_challenges FOR SELECT TO authenticated USING (auth.uid() = target_user_id);

-- Detection events
CREATE TABLE public.detection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  affected_user_id uuid,
  affected_resource_type text,
  affected_resource_id text,
  auto_action_taken text,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolver_notes text,
  source text NOT NULL DEFAULT 'system',
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detection_events TO authenticated;
GRANT ALL ON public.detection_events TO service_role;
ALTER TABLE public.detection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage detection" ON public.detection_events FOR ALL TO authenticated USING (is_admin_or_moderator(auth.uid())) WITH CHECK (is_admin_or_moderator(auth.uid()));

-- User locations
CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  city text,
  region text,
  country text,
  permission_status text NOT NULL DEFAULT 'prompt',
  permission_asked_at timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own location" ON public.user_locations FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Insert own location" ON public.user_locations FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Update own location" ON public.user_locations FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins view locations" ON public.user_locations FOR SELECT TO authenticated USING (is_admin_or_moderator(auth.uid()));

-- KYC
CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  document_type text NOT NULL,
  document_number text,
  document_url text NOT NULL,
  selfie_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  ai_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own kyc" ON public.kyc_verifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Insert own kyc" ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Update own kyc" ON public.kyc_verifications FOR UPDATE TO authenticated USING (auth.uid()=user_id AND status IN ('pending','rejected')) WITH CHECK (auth.uid()=user_id AND status IN ('pending','rejected'));
CREATE POLICY "Admins view kyc" ON public.kyc_verifications FOR SELECT TO authenticated USING (is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins update kyc" ON public.kyc_verifications FOR UPDATE TO authenticated USING (is_admin_or_moderator(auth.uid())) WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Developer API keys
CREATE TABLE public.developer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  developer_name text NOT NULL,
  email text NOT NULL,
  company text,
  application_name text NOT NULL,
  website_url text,
  purpose text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  expected_monthly_requests integer DEFAULT 0,
  api_key text NOT NULL UNIQUE,
  api_secret_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  terms_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_api_keys TO authenticated;
GRANT ALL ON public.developer_api_keys TO service_role;
ALTER TABLE public.developer_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own api keys" ON public.developer_api_keys FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Insert own api keys" ON public.developer_api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Update own api keys" ON public.developer_api_keys FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Delete own api keys" ON public.developer_api_keys FOR DELETE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Admins view api keys" ON public.developer_api_keys FOR SELECT TO authenticated USING (is_admin_or_moderator(auth.uid()));

-- Moderator permissions
CREATE TABLE public.moderator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (moderator_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderator_permissions TO authenticated;
GRANT ALL ON public.moderator_permissions TO service_role;
ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mod perms" ON public.moderator_permissions FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Mods view own perms" ON public.moderator_permissions FOR SELECT USING (moderator_id = auth.uid());
CREATE TRIGGER trg_mod_perms_updated BEFORE UPDATE ON public.moderator_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment method locks
CREATE TABLE public.payment_method_locks (
  method_id text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.payment_method_locks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_method_locks TO authenticated;
GRANT ALL ON public.payment_method_locks TO service_role;
ALTER TABLE public.payment_method_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View pml" ON public.payment_method_locks FOR SELECT USING (true);
CREATE POLICY "Admins insert pml" ON public.payment_method_locks FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins update pml" ON public.payment_method_locks FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins delete pml" ON public.payment_method_locks FOR DELETE TO authenticated USING (is_admin(auth.uid()));

INSERT INTO public.payment_method_locks (method_id, label, enabled) VALUES
  ('wallet','Wallet Balance',true),
  ('bank_transfer','Bank Transfer',true),
  ('card','Debit / Credit Card',true),
  ('upi','UPI',true),
  ('paypal','PayPal',true),
  ('apple_pay','Apple Pay',true),
  ('google_pay','Google Pay',true),
  ('crypto_usdt','USDT',true),
  ('crypto_btc','Bitcoin',true),
  ('crypto_eth','Ethereum',true)
ON CONFLICT (method_id) DO NOTHING;

-- Wallet transfer RPCs
CREATE OR REPLACE FUNCTION public.wallet_hold_transfer(_amount numeric, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL THEN INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0); _bal := 0; END IF;
  IF _bal < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.wallets SET balance = balance - _amount, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description) VALUES (_uid, -_amount, 'admin_debit', 'Money transfer hold ' || _ref);
END $$;

CREATE OR REPLACE FUNCTION public.wallet_refund_transfer(_amount numeric, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description) VALUES (_uid, _amount, 'refund', 'Money transfer refund ' || _ref);
END $$;

CREATE OR REPLACE FUNCTION public.submit_captcha_answer(p_challenge_id uuid, p_answer text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_ch captcha_challenges%ROWTYPE; v_passed boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_ch FROM public.captcha_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_ch IS NULL OR v_ch.target_user_id <> v_user_id THEN RETURN json_build_object('success', false, 'error', 'Not found'); END IF;
  v_passed := lower(trim(coalesce(p_answer,''))) = lower(trim(v_ch.expected_answer));
  UPDATE public.captcha_challenges SET attempts = attempts+1, user_answer = p_answer, status = CASE WHEN v_passed THEN 'passed' WHEN attempts+1>=3 THEN 'failed' ELSE 'pending' END WHERE id = p_challenge_id;
  RETURN json_build_object('success', true, 'passed', v_passed);
END $$;

CREATE OR REPLACE FUNCTION public.start_conversation(p_other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_conv_id uuid; v_existing uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF v_user_id = p_other_user_id THEN RAISE EXCEPTION 'cannot chat with self'; END IF;
  SELECT cp1.conversation_id INTO v_existing FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = v_user_id AND cp2.user_id = p_other_user_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO v_conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conv_id, v_user_id), (v_conv_id, p_other_user_id);
  RETURN v_conv_id;
END $$;

-- Public views
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, user_id, username, avatar_url, uid, free_fire_uid, is_verified, verified_at, created_at, updated_at, last_seen
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.site_settings_public
WITH (security_invoker = on) AS
SELECT id, key, value, updated_at FROM public.site_settings
WHERE key IN ('theme','global_credentials','vapid_public_key','ai_settings','video','emergency_lock','enable_wallets','enable_tournaments','enable_chat','enable_clips','enable_streams','payment','security');
GRANT SELECT ON public.site_settings_public TO anon, authenticated;

-- APK releases (missed)
CREATE TABLE IF NOT EXISTS public.apk_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT '1.0.0',
  file_size text NOT NULL DEFAULT '50 MB',
  file_url text,
  min_android text NOT NULL DEFAULT 'Android 7.0+',
  release_notes text,
  download_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apk_releases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.apk_releases TO authenticated;
GRANT ALL ON public.apk_releases TO service_role;
ALTER TABLE public.apk_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View APK" ON public.apk_releases FOR SELECT USING (true);
CREATE POLICY "Admins manage APK" ON public.apk_releases FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Schema-wide grants (mirror final migration)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;