-- Add UID to profiles
ALTER TABLE public.profiles ADD COLUMN uid TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_unique_uid()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_uid TEXT; uid_exists BOOLEAN;
BEGIN
  LOOP
    new_uid := LPAD(FLOOR(RANDOM() * 9000000000 + 1000000000)::TEXT, 10, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE uid = new_uid) INTO uid_exists;
    EXIT WHEN NOT uid_exists;
  END LOOP;
  RETURN new_uid;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_uid_on_profile_create()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.uid IS NULL THEN NEW.uid := public.generate_unique_uid(); END IF; RETURN NEW; END; $$;

CREATE TRIGGER set_profile_uid BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_uid_on_profile_create();

UPDATE public.profiles SET uid = public.generate_unique_uid() WHERE uid IS NULL;

-- Add email + last_seen to profiles
ALTER TABLE public.profiles ADD COLUMN email TEXT;
ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT now();
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.email);
  RETURN NEW;
END; $$;

UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.user_id = u.id AND p.email IS NULL;

-- Recreate leaderboard view with uid + likes_count
DROP VIEW IF EXISTS public.player_leaderboard; -- @allow-destructive

-- Ban audit log
CREATE TABLE public.ban_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ban','unban')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ban_audit_log TO authenticated;
GRANT ALL ON public.ban_audit_log TO service_role;
ALTER TABLE public.ban_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ban audit" ON public.ban_audit_log FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins insert ban audit" ON public.ban_audit_log FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_ban_audit_log_user_id ON public.ban_audit_log(user_id);

-- Admin update profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- Profile likes
CREATE TABLE public.profile_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_user_id),
  CHECK (user_id != profile_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.profile_likes TO authenticated;
GRANT ALL ON public.profile_likes TO service_role;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View likes" ON public.profile_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Like" ON public.profile_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Unlike" ON public.profile_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate leaderboard view
CREATE VIEW public.player_leaderboard WITH (security_invoker = on) AS
SELECT p.user_id, p.username, p.avatar_url, p.uid,
  COALESCE(COUNT(DISTINCT tp.tournament_id),0) AS tournaments_played,
  0::bigint AS wins,
  COALESCE(SUM(CASE WHEN wt.type='prize' THEN wt.amount ELSE 0 END),0) AS total_earnings,
  COALESCE(likes.like_count,0) AS likes_count
FROM public.profiles p
LEFT JOIN public.tournament_participants tp ON p.user_id=tp.user_id
LEFT JOIN public.wallet_transactions wt ON p.user_id=wt.user_id AND wt.type='prize'
LEFT JOIN (SELECT profile_user_id, COUNT(*) as like_count FROM public.profile_likes GROUP BY profile_user_id) likes ON p.user_id=likes.profile_user_id
GROUP BY p.user_id, p.username, p.avatar_url, p.uid, likes.like_count;

-- Tournament participants extra columns
ALTER TABLE public.tournament_participants
  ADD COLUMN player_name TEXT,
  ADD COLUMN game_uid TEXT,
  ADD COLUMN phone_number TEXT,
  ADD COLUMN is_winner BOOLEAN DEFAULT false;
CREATE POLICY "Admins update tournament participants" ON public.tournament_participants FOR UPDATE USING (is_admin(auth.uid()));

-- Tournaments extras
ALTER TABLE public.tournaments ADD COLUMN image_url TEXT;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "System insert own notification" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uid TEXT,
  email TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  screenshot_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone create tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "View own tickets" ON public.support_tickets FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Admins view tickets" ON public.support_tickets FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins delete tickets" ON public.support_tickets FOR DELETE USING (is_admin(auth.uid()));
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Site settings
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins insert settings" ON public.site_settings FOR INSERT WITH CHECK (is_admin(auth.uid()));
INSERT INTO public.site_settings (key, value) VALUES
('theme','{"primaryColor":"210 100% 55%","darkMode":true}'::jsonb);

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  winner_user_id UUID,
  prize_amount DECIMAL(10,2),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View published announcements" ON public.announcements FOR SELECT USING (is_published=true);
CREATE POLICY "Admins view all announcements" ON public.announcements FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins create announcements" ON public.announcements FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins update announcements" ON public.announcements FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE USING (is_admin(auth.uid()));
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Topup requests
CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  utr VARCHAR(50) NOT NULL,
  screenshot_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.topup_requests TO authenticated;
GRANT ALL ON public.topup_requests TO service_role;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own topups" ON public.topup_requests FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Create own topups" ON public.topup_requests FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins view topups" ON public.topup_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins update topups" ON public.topup_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE TRIGGER update_topup_requests_updated_at BEFORE UPDATE ON public.topup_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  upi_id VARCHAR(100) NOT NULL,
  account_holder_name VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Create own withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins view withdrawals" ON public.withdrawal_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins update withdrawals" ON public.withdrawal_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Login history
CREATE TABLE public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  browser TEXT, os TEXT, device_name TEXT, ip_address TEXT, city TEXT, country TEXT,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own login history" ON public.login_history FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Insert own login history" ON public.login_history FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Service insert login history" ON public.login_history FOR INSERT TO service_role WITH CHECK (true);
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;