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

CREATE POLICY "Users view own api keys" ON public.developer_api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own api keys" ON public.developer_api_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own api keys" ON public.developer_api_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own api keys" ON public.developer_api_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all api keys" ON public.developer_api_keys
  FOR SELECT TO authenticated USING (is_admin_or_moderator(auth.uid()));

CREATE INDEX idx_dev_api_keys_user ON public.developer_api_keys(user_id);

CREATE TRIGGER trg_dev_api_keys_updated
  BEFORE UPDATE ON public.developer_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();