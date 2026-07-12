
-- Login attempts tracking for brute-force protection
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to insert via service role; no public access needed
CREATE POLICY "Service role only" ON public.login_attempts
  FOR ALL USING (false) WITH CHECK (false);

-- Suspicious activity flags
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

ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suspicious activities" ON public.suspicious_activities
  FOR ALL USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Redeem attempt tracking for daily limits
CREATE TABLE public.redeem_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_code text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redeem attempts" ON public.redeem_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redeem attempts" ON public.redeem_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redeem attempts" ON public.redeem_attempts
  FOR SELECT USING (is_admin_or_moderator(auth.uid()));

-- Add device_id column to login_history for device verification
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS is_trusted boolean NOT NULL DEFAULT false;
