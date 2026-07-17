-- Prereq: app_role enum, user_roles table, and has_role() used by admin policies
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ur_select_own" ON public.user_roles;
CREATE POLICY "ur_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Payment method locks
CREATE TABLE IF NOT EXISTS public.payment_method_locks (
  method_id   text PRIMARY KEY,
  label       text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.payment_method_locks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_method_locks TO authenticated;
GRANT ALL ON public.payment_method_locks TO service_role;

ALTER TABLE public.payment_method_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pml_select_all"   ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_insert" ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_update" ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_delete" ON public.payment_method_locks;

CREATE POLICY "pml_select_all" ON public.payment_method_locks
  FOR SELECT USING (true);

CREATE POLICY "pml_admin_insert" ON public.payment_method_locks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pml_admin_update" ON public.payment_method_locks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pml_admin_delete" ON public.payment_method_locks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION public.pml_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS pml_touch ON public.payment_method_locks;
CREATE TRIGGER pml_touch BEFORE UPDATE ON public.payment_method_locks
  FOR EACH ROW EXECUTE FUNCTION public.pml_touch_updated_at();

-- Realtime broadcast
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_method_locks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.payment_method_locks REPLICA IDENTITY FULL;

-- Seed all payment methods (idempotent)
INSERT INTO public.payment_method_locks (method_id, label, enabled) VALUES
  ('wallet',        'Wallet Balance',      true),
  ('bank_transfer', 'Bank Transfer',       true),
  ('card',          'Debit / Credit Card', true),
  ('upi',           'UPI',                 true),
  ('paypal',        'PayPal',              true),
  ('apple_pay',     'Apple Pay',           true),
  ('google_pay',    'Google Pay',          true),
  ('crypto_usdt',   'USDT',                true),
  ('crypto_btc',    'Bitcoin',             true),
  ('crypto_eth',    'Ethereum',            true)
ON CONFLICT (method_id) DO NOTHING;