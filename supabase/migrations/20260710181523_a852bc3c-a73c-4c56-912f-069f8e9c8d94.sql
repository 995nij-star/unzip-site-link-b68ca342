-- wallet_transactions extended types
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('deposit','withdrawal','entry_fee','prize','refund','admin_credit','admin_debit','gift_code'));

-- login_otps failed_attempts
ALTER TABLE public.login_otps ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;

-- Profile extra columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_fire_uid text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_shadow_banned boolean NOT NULL DEFAULT false;

-- Admin+moderator helper
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'))
$$;

-- Live streams
CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  stream_url text NOT NULL,
  platform text NOT NULL DEFAULT 'youtube',
  thumbnail_url text,
  is_live boolean NOT NULL DEFAULT true,
  viewer_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT ON public.live_streams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View live streams" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "Create own stream" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Update own stream" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Delete own stream" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.stream_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stream_messages TO anon, authenticated;
GRANT INSERT, DELETE ON public.stream_messages TO authenticated;
GRANT ALL ON public.stream_messages TO service_role;
ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View stream messages" ON public.stream_messages FOR SELECT USING (true);
CREATE POLICY "Send stream messages" ON public.stream_messages FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Delete own stream message" ON public.stream_messages FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.stream_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '🔥',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stream_reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.stream_reactions TO authenticated;
GRANT ALL ON public.stream_reactions TO service_role;
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View reactions" ON public.stream_reactions FOR SELECT USING (true);
CREATE POLICY "React" ON public.stream_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Remove reaction" ON public.stream_reactions FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
GRANT SELECT, INSERT ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  attachment_url text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE user_id=_user_id AND conversation_id=_conversation_id)
$$;

CREATE POLICY "View own conversations" ON public.conversations FOR SELECT TO authenticated USING (is_conversation_participant(auth.uid(), id));
CREATE POLICY "Create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own conversation" ON public.conversations FOR UPDATE TO authenticated USING (is_conversation_participant(auth.uid(), id));
CREATE POLICY "View own participants" ON public.conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(auth.uid(), conversation_id));
CREATE POLICY "Add participants" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "View own messages" ON public.direct_messages FOR SELECT TO authenticated USING (is_conversation_participant(auth.uid(), conversation_id));
CREATE POLICY "Send messages" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (auth.uid()=sender_id AND is_conversation_participant(auth.uid(), conversation_id));
CREATE POLICY "Update own message" ON public.direct_messages FOR UPDATE TO authenticated USING (is_conversation_participant(auth.uid(), conversation_id));

-- Gaming clips
CREATE TABLE public.gaming_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  short_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gaming_clips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gaming_clips TO authenticated;
GRANT ALL ON public.gaming_clips TO service_role;
ALTER TABLE public.gaming_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View clips" ON public.gaming_clips FOR SELECT USING (true);
CREATE POLICY "Upload own clip" ON public.gaming_clips FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Delete own clip" ON public.gaming_clips FOR DELETE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Update own clip" ON public.gaming_clips FOR UPDATE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.clip_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clip_id, user_id)
);
GRANT SELECT ON public.clip_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.clip_likes TO authenticated;
GRANT ALL ON public.clip_likes TO service_role;
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View clip likes" ON public.clip_likes FOR SELECT USING (true);
CREATE POLICY "Like clip" ON public.clip_likes FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Unlike clip" ON public.clip_likes FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.clip_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clip_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.clip_comments TO authenticated;
GRANT ALL ON public.clip_comments TO service_role;
ALTER TABLE public.clip_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View clip comments" ON public.clip_comments FOR SELECT USING (true);
CREATE POLICY "Add clip comment" ON public.clip_comments FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Delete own clip comment" ON public.clip_comments FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE public.clip_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  UNIQUE(clip_id, reporter_id)
);
GRANT SELECT, INSERT ON public.clip_reports TO authenticated;
GRANT ALL ON public.clip_reports TO service_role;
ALTER TABLE public.clip_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report clip" ON public.clip_reports FOR INSERT TO authenticated WITH CHECK (auth.uid()=reporter_id);
CREATE POLICY "View own report" ON public.clip_reports FOR SELECT TO authenticated USING (auth.uid()=reporter_id);

-- AI chat messages
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own AI chats" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Insert own AI chats" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Delete own AI chats" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- Login attempts, suspicious activities, redeem attempts
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service only login attempts" ON public.login_attempts FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  activity_type text NOT NULL,
  description text,
  ip_address text,
  device_info text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suspicious_activities TO authenticated;
GRANT ALL ON public.suspicious_activities TO service_role;
ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage suspicious" ON public.suspicious_activities FOR ALL TO authenticated USING (is_admin_or_moderator(auth.uid())) WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE TABLE public.redeem_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_code text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.redeem_attempts TO authenticated;
GRANT ALL ON public.redeem_attempts TO service_role;
ALTER TABLE public.redeem_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own redeem" ON public.redeem_attempts FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Insert own redeem" ON public.redeem_attempts FOR INSERT WITH CHECK (auth.uid()=user_id);

-- login_history extras
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS is_trusted boolean NOT NULL DEFAULT false;

-- Mod applications
CREATE TABLE public.mod_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  experience text NOT NULL,
  gaming_knowledge text NOT NULL DEFAULT 'intermediate',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mod_applications TO authenticated;
GRANT ALL ON public.mod_applications TO service_role;
ALTER TABLE public.mod_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own mod app" ON public.mod_applications FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Submit mod app" ON public.mod_applications FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins view mod apps" ON public.mod_applications FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins update mod apps" ON public.mod_applications FOR UPDATE USING (is_admin(auth.uid()));

-- Admin audit log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View admin audit" ON public.admin_audit_log FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Insert admin audit" ON public.admin_audit_log FOR INSERT WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Automation rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_threshold integer NOT NULL DEFAULT 3,
  action_type text NOT NULL,
  action_duration_hours integer DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage automation" ON public.automation_rules FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own push" ON public.push_subscriptions FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Insert own push" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Update own push" ON public.push_subscriptions FOR UPDATE USING (auth.uid()=user_id);
CREATE POLICY "Delete own push" ON public.push_subscriptions FOR DELETE USING (auth.uid()=user_id);

-- User follows
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
GRANT SELECT ON public.user_follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Follow" ON public.user_follows FOR INSERT WITH CHECK (auth.uid()=follower_id AND auth.uid()!=following_id);
CREATE POLICY "Unfollow" ON public.user_follows FOR DELETE USING (auth.uid()=follower_id);