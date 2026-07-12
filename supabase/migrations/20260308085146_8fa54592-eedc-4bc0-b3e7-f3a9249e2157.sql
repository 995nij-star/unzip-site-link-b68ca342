
-- Add trust_score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_shadow_banned boolean NOT NULL DEFAULT false;

-- Create admin_audit_log for all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_threshold integer NOT NULL DEFAULT 3,
  action_type text NOT NULL,
  action_duration_hours integer DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation rules" ON public.automation_rules
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Function to recalculate trust score
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_score integer := 100;
  report_count integer;
  tournaments_completed integer;
  ban_count integer;
  suspicious_count integer;
  account_age_days integer;
BEGIN
  -- Deduct for reports against user
  SELECT COUNT(*) INTO report_count FROM public.user_reports WHERE reported_user_id = _user_id;
  base_score := base_score - (report_count * 5);

  -- Deduct for bans
  SELECT COUNT(*) INTO ban_count FROM public.ban_audit_log WHERE user_id = _user_id AND action = 'ban';
  base_score := base_score - (ban_count * 15);

  -- Deduct for suspicious activity
  SELECT COUNT(*) INTO suspicious_count FROM public.suspicious_activities WHERE user_id = _user_id;
  base_score := base_score - (suspicious_count * 10);

  -- Add for completed tournaments
  SELECT COUNT(*) INTO tournaments_completed FROM public.tournament_participants tp
    JOIN public.tournaments t ON t.id = tp.tournament_id
    WHERE tp.user_id = _user_id AND t.status = 'completed';
  base_score := base_score + LEAST(tournaments_completed * 2, 30);

  -- Add for account age (max +20)
  SELECT EXTRACT(DAY FROM now() - created_at)::integer INTO account_age_days FROM public.profiles WHERE user_id = _user_id;
  base_score := base_score + LEAST(COALESCE(account_age_days, 0) / 7, 20);

  -- Clamp between 0 and 100
  RETURN GREATEST(0, LEAST(100, base_score));
END;
$$;
