
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='app_role' AND e.enumlabel='super_admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_method_locks (
  method_id  text PRIMARY KEY,
  label      text NOT NULL,
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.payment_method_locks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_method_locks TO authenticated;
GRANT ALL ON public.payment_method_locks TO service_role;

ALTER TABLE public.payment_method_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pml_select_all"   ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_insert" ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_update" ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_delete" ON public.payment_method_locks;

CREATE POLICY "pml_select_all" ON public.payment_method_locks FOR SELECT USING (true);
CREATE POLICY "pml_admin_insert" ON public.payment_method_locks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "pml_admin_update" ON public.payment_method_locks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "pml_admin_delete" ON public.payment_method_locks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.set_payment_method_enabled(_method_id text, _enabled boolean)
RETURNS public.payment_method_locks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.payment_method_locks;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;
  UPDATE public.payment_method_locks
    SET enabled=_enabled, updated_at=now(), updated_by=auth.uid()
    WHERE method_id=_method_id RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment method not found: %', _method_id USING ERRCODE='P0002';
  END IF;
  RETURN v_row;
END; $$;

REVOKE ALL ON FUNCTION public.set_payment_method_enabled(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_payment_method_enabled(text,boolean) TO authenticated, service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_method_locks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.payment_method_locks REPLICA IDENTITY FULL;

INSERT INTO public.payment_method_locks (method_id,label,enabled) VALUES
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
