
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  browser text,
  os text,
  device_name text,
  ip_address text,
  city text,
  country text,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login history"
  ON public.login_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Edge function can insert login history"
  ON public.login_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert login history"
  ON public.login_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_logged_in_at ON public.login_history(logged_in_at DESC);
