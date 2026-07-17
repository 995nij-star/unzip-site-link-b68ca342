-- =====================================================================
-- Fix payment_method_locks permission-denied + permanent Super Admin.
--
-- This project uses your own Supabase (project id: tgcgldoakatddqacwrco),
-- so Lovable can't run migrations against it. Paste this whole file into
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to run more than once.
-- =====================================================================

-- 1. Extend app_role enum with 'super_admin' (only if missing).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- 2. Required table GRANTs (RLS still enforces row-level access).
GRANT SELECT ON public.payment_method_locks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_method_locks TO authenticated;
GRANT ALL ON public.payment_method_locks TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER TABLE public.payment_method_locks ENABLE ROW LEVEL SECURITY;

-- 3. Reset RLS policies.
DROP POLICY IF EXISTS "pml_select_all"   ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_select_auth"  ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_insert" ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_update" ON public.payment_method_locks;
DROP POLICY IF EXISTS "pml_admin_delete" ON public.payment_method_locks;

-- SELECT for everyone (anon + authenticated) so the app can render locks.
CREATE POLICY "pml_select_all"
  ON public.payment_method_locks FOR SELECT
  USING (true);

-- INSERT / UPDATE / DELETE only for admins & super_admins.
CREATE POLICY "pml_admin_insert"
  ON public.payment_method_locks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "pml_admin_update"
  ON public.payment_method_locks FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "pml_admin_delete"
  ON public.payment_method_locks FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Admin-only RPC used by the Admin Panel. This keeps RLS enabled and avoids
-- accidentally granting UPDATE to anon while still giving admins a reliable
-- write path.
CREATE OR REPLACE FUNCTION public.set_payment_method_enabled(_method_id text, _enabled boolean)
RETURNS public.payment_method_locks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.payment_method_locks;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payment_method_locks
  SET enabled = _enabled,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE method_id = _method_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment method not found: %', _method_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_payment_method_enabled(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_payment_method_enabled(text, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin')
  )
$$;

-- 4. Make okbin8511@gmail.com a permanent admin + super_admin.
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = 'okbin8511@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'User okbin8511@gmail.com not found in auth.users. Sign up first, then re-run this file.';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 5. Seed all 10 payment methods if missing.
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

-- 6. Verification queries (optional — run manually).
--   SELECT public.has_role(id, 'admin')       AS is_admin,
--          public.has_role(id, 'super_admin') AS is_super_admin
--     FROM auth.users WHERE email = 'okbin8511@gmail.com';
--
--   SELECT method_id, enabled FROM public.payment_method_locks ORDER BY method_id;
