
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE, uid text UNIQUE, email text, avatar_url text,
  free_fire_uid text, gender text, country text, bio text,
  is_banned boolean DEFAULT false, ban_reason text,
  is_verified boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false, premium_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (auth.uid()=user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)), NEW.email, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO public.profiles (user_id, email, username)
SELECT id, email, split_part(email,'@',1) FROM auth.users ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker=on) AS
  SELECT id,user_id,username,uid,avatar_url,gender,country,bio,is_verified,is_premium,created_at
  FROM public.profiles WHERE COALESCE(is_banned,false)=false;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- WALLETS
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_own_or_admin" ON public.wallets FOR ALL TO authenticated
  USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (auth.uid()=user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL, type text NOT NULL, description text, reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wtx_own_or_admin" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "wtx_insert_own_or_admin" ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info', title text NOT NULL, message text NOT NULL,
  tournament_id uuid, is_read boolean NOT NULL DEFAULT false, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own_or_admin" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- CLIPS
CREATE TABLE public.gaming_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL, description text, video_url text NOT NULL, thumbnail_url text,
  duration numeric NOT NULL DEFAULT 0, views bigint NOT NULL DEFAULT 0,
  short_code text UNIQUE, is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gaming_clips TO authenticated;
GRANT SELECT ON public.gaming_clips TO anon;
GRANT ALL ON public.gaming_clips TO service_role;
ALTER TABLE public.gaming_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clips_select" ON public.gaming_clips FOR SELECT USING (COALESCE(is_hidden,false)=false OR auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clips_insert_own" ON public.gaming_clips FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "clips_update_own_or_admin" ON public.gaming_clips FOR UPDATE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clips_delete_own_or_admin" ON public.gaming_clips FOR DELETE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER clips_updated BEFORE UPDATE ON public.gaming_clips FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.clip_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(clip_id,user_id)
);
GRANT SELECT, INSERT, DELETE ON public.clip_likes TO authenticated;
GRANT SELECT ON public.clip_likes TO anon;
GRANT ALL ON public.clip_likes TO service_role;
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_select" ON public.clip_likes FOR SELECT USING (true);
CREATE POLICY "cl_ins" ON public.clip_likes FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "cl_del" ON public.clip_likes FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.clip_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clip_comments TO authenticated;
GRANT SELECT ON public.clip_comments TO anon;
GRANT ALL ON public.clip_comments TO service_role;
ALTER TABLE public.clip_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_sel" ON public.clip_comments FOR SELECT USING (true);
CREATE POLICY "cc_ins" ON public.clip_comments FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "cc_upd" ON public.clip_comments FOR UPDATE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cc_del" ON public.clip_comments FOR DELETE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.clip_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL, details text, status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.clip_reports TO authenticated;
GRANT ALL ON public.clip_reports TO service_role;
ALTER TABLE public.clip_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_ins" ON public.clip_reports FOR INSERT TO authenticated WITH CHECK (auth.uid()=reporter_id);
CREATE POLICY "cr_sel" ON public.clip_reports FOR SELECT TO authenticated USING (auth.uid()=reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "cr_upd" ON public.clip_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- FOLLOWS & PROFILE LIKES
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(follower_id,following_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT ON public.user_follows TO anon;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uf_sel" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "uf_ins" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid()=follower_id);
CREATE POLICY "uf_del" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid()=follower_id);

CREATE TABLE public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(profile_user_id,liker_id)
);
GRANT SELECT, INSERT, DELETE ON public.profile_likes TO authenticated;
GRANT SELECT ON public.profile_likes TO anon;
GRANT ALL ON public.profile_likes TO service_role;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pl_sel" ON public.profile_likes FOR SELECT USING (true);
CREATE POLICY "pl_ins" ON public.profile_likes FOR INSERT TO authenticated WITH CHECK (auth.uid()=liker_id);
CREATE POLICY "pl_del" ON public.profile_likes FOR DELETE TO authenticated USING (auth.uid()=liker_id);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(conversation_id,user_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=_conv AND user_id=_user)
$$;

CREATE POLICY "c_sel" ON public.conversations FOR SELECT TO authenticated USING (public.is_conversation_participant(id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "c_ins" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "c_upd" ON public.conversations FOR UPDATE TO authenticated USING (public.is_conversation_participant(id,auth.uid()));
CREATE POLICY "cp_sel" ON public.conversation_participants FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_conversation_participant(conversation_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cp_ins" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() OR public.is_conversation_participant(conversation_id,auth.uid()));
CREATE POLICY "cp_del" ON public.conversation_participants FOR DELETE TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL, is_read boolean NOT NULL DEFAULT false,
  attachment_url text, attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm_sel" ON public.direct_messages FOR SELECT TO authenticated USING (public.is_conversation_participant(conversation_id,auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dm_ins" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND public.is_conversation_participant(conversation_id,auth.uid()));
CREATE POLICY "dm_upd" ON public.direct_messages FOR UPDATE TO authenticated USING (public.is_conversation_participant(conversation_id,auth.uid()));
CREATE POLICY "dm_del" ON public.direct_messages FOR DELETE TO authenticated USING (sender_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- STREAMS
CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL, description text, game text, stream_url text, thumbnail_url text,
  is_live boolean NOT NULL DEFAULT false, viewer_count integer NOT NULL DEFAULT 0,
  started_at timestamptz, ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT SELECT ON public.live_streams TO anon;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_sel" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "ls_ins" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "ls_upd" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ls_del" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER ls_updated BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.stream_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.stream_messages TO authenticated;
GRANT SELECT ON public.stream_messages TO anon;
GRANT ALL ON public.stream_messages TO service_role;
ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_sel" ON public.stream_messages FOR SELECT USING (true);
CREATE POLICY "sm_ins" ON public.stream_messages FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "sm_del" ON public.stream_messages FOR DELETE TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_messages;
ALTER TABLE public.stream_messages REPLICA IDENTITY FULL;

CREATE TABLE public.stream_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stream_reactions TO authenticated;
GRANT SELECT ON public.stream_reactions TO anon;
GRANT ALL ON public.stream_reactions TO service_role;
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_sel" ON public.stream_reactions FOR SELECT USING (true);
CREATE POLICY "sr_ins" ON public.stream_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);

-- TOURNAMENTS + PARTICIPANTS (define participants BEFORE tournaments_safe)
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text, game text NOT NULL DEFAULT 'Free Fire',
  entry_fee numeric(12,2) NOT NULL DEFAULT 0, prize_pool numeric(12,2) NOT NULL DEFAULT 0,
  max_players integer NOT NULL DEFAULT 100, current_players integer NOT NULL DEFAULT 0,
  start_time timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'upcoming',
  room_id text, room_password text, banner_url text, rules text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT SELECT ON public.tournaments TO anon;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trn_sel_admin" ON public.tournaments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "trn_mut_admin" ON public.tournaments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trn_updated BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text, game_uid text, phone_number text,
  joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tournament_id,user_id)
);
GRANT SELECT, INSERT, DELETE ON public.tournament_participants TO authenticated;
GRANT ALL ON public.tournament_participants TO service_role;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tp_sel" ON public.tournament_participants FOR SELECT TO authenticated
  USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "tp_ins" ON public.tournament_participants FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "tp_del" ON public.tournament_participants FOR DELETE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE VIEW public.tournaments_safe WITH (security_invoker=on) AS
  SELECT id,title,description,game,entry_fee,prize_pool,max_players,current_players,start_time,status,room_id,banner_url,rules,created_at,updated_at,
    CASE WHEN status IN ('live','completed') OR EXISTS(SELECT 1 FROM public.tournament_participants tp WHERE tp.tournament_id=tournaments.id AND tp.user_id=auth.uid()) THEN room_password ELSE NULL END AS room_password
  FROM public.tournaments;
GRANT SELECT ON public.tournaments_safe TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid, p_player_name text DEFAULT NULL, p_game_uid text DEFAULT NULL, p_phone_number text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_t public.tournaments; v_bal numeric;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_t FROM public.tournaments WHERE id=p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Tournament not found'); END IF;
  IF v_t.current_players >= v_t.max_players THEN RETURN jsonb_build_object('success',false,'error','Tournament is full'); END IF;
  IF EXISTS(SELECT 1 FROM public.tournament_participants WHERE tournament_id=p_tournament_id AND user_id=v_uid) THEN
    RETURN jsonb_build_object('success',false,'error','Already joined');
  END IF;
  IF v_t.entry_fee > 0 THEN
    SELECT balance INTO v_bal FROM public.wallets WHERE user_id=v_uid FOR UPDATE;
    IF COALESCE(v_bal,0) < v_t.entry_fee THEN RETURN jsonb_build_object('success',false,'error','Insufficient balance'); END IF;
    UPDATE public.wallets SET balance=balance-v_t.entry_fee WHERE user_id=v_uid;
    INSERT INTO public.wallet_transactions(user_id,amount,type,description,reference_id)
      VALUES (v_uid,-v_t.entry_fee,'tournament_entry','Entry: '||v_t.title,p_tournament_id);
  END IF;
  INSERT INTO public.tournament_participants(tournament_id,user_id,player_name,game_uid,phone_number)
    VALUES (p_tournament_id,v_uid,p_player_name,p_game_uid,p_phone_number);
  UPDATE public.tournaments SET current_players=current_players+1 WHERE id=p_tournament_id;
  RETURN jsonb_build_object('success',true,'message','Joined tournament','charged_fee',v_t.entry_fee);
END $$;
GRANT EXECUTE ON FUNCTION public.join_tournament(uuid,text,text,text) TO authenticated;

-- TOPUP / WITHDRAWAL
CREATE TABLE public.topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL, method text NOT NULL, utr text, screenshot_url text,
  status text NOT NULL DEFAULT 'pending', admin_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.topup_requests TO authenticated;
GRANT ALL ON public.topup_requests TO service_role;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topup_sel" ON public.topup_requests FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "topup_ins" ON public.topup_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "topup_upd" ON public.topup_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER topup_updated BEFORE UPDATE ON public.topup_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL, method text NOT NULL, account_details jsonb,
  status text NOT NULL DEFAULT 'pending', admin_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_sel" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wd_ins" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "wd_upd" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER wd_updated BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- GIFT CODES
CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, amount numeric(12,2) NOT NULL,
  max_uses integer NOT NULL DEFAULT 1, uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_sel" ON public.gift_codes FOR SELECT TO authenticated USING (created_by=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gc_ins" ON public.gift_codes FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gc_upd" ON public.gift_codes FOR UPDATE TO authenticated USING (created_by=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gc_del" ON public.gift_codes FOR DELETE TO authenticated USING (created_by=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.gift_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id,user_id)
);
GRANT SELECT, INSERT ON public.gift_code_redemptions TO authenticated;
GRANT ALL ON public.gift_code_redemptions TO service_role;
ALTER TABLE public.gift_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gcr_sel" ON public.gift_code_redemptions FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "gcr_ins" ON public.gift_code_redemptions FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());

CREATE TABLE public.redeem_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL, success boolean NOT NULL DEFAULT false, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.redeem_attempts TO authenticated;
GRANT ALL ON public.redeem_attempts TO service_role;
ALTER TABLE public.redeem_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_sel" ON public.redeem_attempts FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ra_ins" ON public.redeem_attempts FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());

-- KYC
CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, document_type text, document_number text,
  document_front_url text, document_back_url text, selfie_url text,
  status text NOT NULL DEFAULT 'pending', ai_score numeric, ai_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc_sel" ON public.kyc_verifications FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "kyc_ins" ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "kyc_upd" ON public.kyc_verifications FOR UPDATE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER kyc_updated BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- SUPPORT TICKETS
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type text NOT NULL, subject text, message text NOT NULL,
  status text NOT NULL DEFAULT 'open', admin_notes text, screenshot_urls text[],
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_sel" ON public.support_tickets FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "st_ins" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "st_upd" ON public.support_tickets FOR UPDATE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER st_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, message text, type text NOT NULL DEFAULT 'general',
  winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true, starts_at timestamptz, ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_sel" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "ann_mut" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER ann_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- SITE SETTINGS
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss_sel_admin" ON public.site_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "ss_mut_admin" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE VIEW public.site_settings_public WITH (security_invoker=on) AS
  SELECT id,key,value,updated_at FROM public.site_settings WHERE is_public=true;
GRANT SELECT ON public.site_settings_public TO anon, authenticated;

INSERT INTO public.site_settings(key,value,is_public) VALUES
  ('theme','{}'::jsonb,true),('payment','{}'::jsonb,true),('login_page','{}'::jsonb,true),
  ('video','{}'::jsonb,true),('security','{}'::jsonb,false),('ai','{}'::jsonb,false),
  ('app_version','{}'::jsonb,true),('maintenance','{"enabled":false}'::jsonb,true)
ON CONFLICT (key) DO NOTHING;

-- AI CHAT
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL, content text NOT NULL, scope text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aicm_sel" ON public.ai_chat_messages FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "aicm_ins" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() OR user_id IS NULL);
CREATE POLICY "aicm_del" ON public.ai_chat_messages FOR DELETE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

-- BAN / LOCKS / AUDIT
CREATE TABLE public.ban_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, reason text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ban_audit_log TO authenticated;
GRANT ALL ON public.ban_audit_log TO service_role;
ALTER TABLE public.ban_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bal_sel" ON public.ban_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "bal_ins" ON public.ban_audit_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.account_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text, locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_until timestamptz, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.account_locks TO authenticated;
GRANT ALL ON public.account_locks TO service_role;
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_admin" ON public.account_locks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, target_type text, target_id text, details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aal_sel" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "aal_ins" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- APK / AUTOMATION
CREATE TABLE public.apk_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL, build_number integer, download_url text NOT NULL,
  changelog text, file_size bigint,
  is_active boolean NOT NULL DEFAULT true, is_mandatory boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apk_releases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.apk_releases TO authenticated;
GRANT ALL ON public.apk_releases TO service_role;
ALTER TABLE public.apk_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apk_sel" ON public.apk_releases FOR SELECT USING (true);
CREATE POLICY "apk_admin" ON public.apk_releases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, trigger_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb, actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_admin" ON public.automation_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER ar_updated BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- BOT / CAPTCHA
CREATE TABLE public.bot_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text, user_agent text, score numeric, passed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bot_checks TO authenticated;
GRANT INSERT ON public.bot_checks TO anon;
GRANT ALL ON public.bot_checks TO service_role;
ALTER TABLE public.bot_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_admin_sel" ON public.bot_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "bc_ins" ON public.bot_checks FOR INSERT WITH CHECK (true);

CREATE TABLE public.captcha_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL, challenge text NOT NULL, answer text NOT NULL,
  solved boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.captcha_challenges TO authenticated;
GRANT INSERT, UPDATE ON public.captcha_challenges TO anon;
GRANT ALL ON public.captcha_challenges TO service_role;
ALTER TABLE public.captcha_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_admin_sel" ON public.captcha_challenges FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "cc_ins" ON public.captcha_challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "cc_upd" ON public.captcha_challenges FOR UPDATE USING (true);

CREATE OR REPLACE VIEW public.captcha_challenges_public WITH (security_invoker=on) AS
  SELECT id, token, challenge, solved, expires_at, created_at FROM public.captcha_challenges;
GRANT SELECT ON public.captcha_challenges_public TO anon, authenticated;

-- DETECTION / SUSPICIOUS
CREATE TABLE public.detection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL, severity text NOT NULL DEFAULT 'low', details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.detection_events TO authenticated;
GRANT ALL ON public.detection_events TO service_role;
ALTER TABLE public.detection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "de_sel" ON public.detection_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "de_ins" ON public.detection_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL, description text, severity text NOT NULL DEFAULT 'low',
  metadata jsonb, reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.suspicious_activities TO authenticated;
GRANT ALL ON public.suspicious_activities TO service_role;
ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_admin" ON public.suspicious_activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- DEV API KEYS
CREATE TABLE public.developer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, key_hash text NOT NULL, key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}', last_used_at timestamptz,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_api_keys TO authenticated;
GRANT ALL ON public.developer_api_keys TO service_role;
ALTER TABLE public.developer_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dak_own_or_admin" ON public.developer_api_keys FOR ALL TO authenticated
  USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

-- LOGIN HISTORY
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  browser text, os text, device_name text, device_type text,
  ip_address text, city text, country text,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lh_sel" ON public.login_history FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lh_ins" ON public.login_history FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());

-- MOD APPS / PERMISSIONS
CREATE TABLE public.mod_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL, experience text, availability text,
  status text NOT NULL DEFAULT 'pending', admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mod_applications TO authenticated;
GRANT ALL ON public.mod_applications TO service_role;
ALTER TABLE public.mod_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_sel" ON public.mod_applications FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ma_ins" ON public.mod_applications FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "ma_upd" ON public.mod_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER ma_updated BEFORE UPDATE ON public.mod_applications FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.moderator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb, duties text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.moderator_permissions TO authenticated;
GRANT ALL ON public.moderator_permissions TO service_role;
ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_sel" ON public.moderator_permissions FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mp_mut" ON public.moderator_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER mp_updated BEFORE UPDATE ON public.moderator_permissions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PUSH SUBS / LOCATIONS
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL, p256dh text, auth text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_own_or_admin" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude numeric, longitude numeric, city text, region text, country text,
  ip_address text, accuracy numeric,
  updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ul_sel" ON public.user_locations FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ul_ins" ON public.user_locations FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "ul_upd" ON public.user_locations FOR UPDATE TO authenticated USING (user_id=auth.uid());

-- LEADERBOARD VIEW
CREATE OR REPLACE VIEW public.player_leaderboard WITH (security_invoker=on) AS
  SELECT p.user_id, p.username, p.avatar_url, p.uid,
    COUNT(DISTINCT tp.tournament_id) AS tournaments_joined,
    COALESCE(SUM(CASE WHEN wt.type='tournament_win' THEN wt.amount ELSE 0 END),0) AS total_winnings
  FROM public.profiles p
  LEFT JOIN public.tournament_participants tp ON tp.user_id = p.user_id
  LEFT JOIN public.wallet_transactions wt ON wt.user_id = p.user_id
  WHERE COALESCE(p.is_banned,false)=false
  GROUP BY p.user_id, p.username, p.avatar_url, p.uid;
GRANT SELECT ON public.player_leaderboard TO anon, authenticated;

-- Realtime on key tables
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
