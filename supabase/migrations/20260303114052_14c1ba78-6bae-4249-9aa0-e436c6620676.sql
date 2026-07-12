
-- Gift codes table
CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expiry timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Track which users redeemed which codes
CREATE TABLE public.gift_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gift_code_id uuid NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, gift_code_id)
);

-- RLS
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Gift codes: admins full access, users can read active codes (for validation)
CREATE POLICY "Admins can manage gift codes" ON public.gift_codes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can view active gift codes" ON public.gift_codes FOR SELECT TO authenticated USING (is_active = true);

-- Redemptions: users see own, admins see all
CREATE POLICY "Users can view own redemptions" ON public.gift_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all redemptions" ON public.gift_code_redemptions FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Redeem function (atomic, handles all validation)
CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_gift gift_codes%ROWTYPE;
  v_already_redeemed boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the gift code
  SELECT * INTO v_gift FROM public.gift_codes WHERE code = UPPER(TRIM(p_code)) AND is_active = true;
  IF v_gift IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or inactive gift code');
  END IF;

  -- Check expiry
  IF v_gift.expiry < now() THEN
    RETURN json_build_object('success', false, 'error', 'This gift code has expired');
  END IF;

  -- Check max uses
  IF v_gift.used_count >= v_gift.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'This gift code has reached its usage limit');
  END IF;

  -- Check if already redeemed by this user
  SELECT EXISTS(SELECT 1 FROM public.gift_code_redemptions WHERE user_id = v_user_id AND gift_code_id = v_gift.id) INTO v_already_redeemed;
  IF v_already_redeemed THEN
    RETURN json_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;

  -- Add to wallet
  UPDATE public.wallets SET balance = balance + v_gift.amount, updated_at = now() WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, v_gift.amount, 'gift_code', 'Gift code: ' || v_gift.code, v_gift.id);

  -- Record redemption
  INSERT INTO public.gift_code_redemptions (user_id, gift_code_id) VALUES (v_user_id, v_gift.id);

  -- Increment used count
  UPDATE public.gift_codes SET used_count = used_count + 1 WHERE id = v_gift.id;

  RETURN json_build_object('success', true, 'message', '₹' || v_gift.amount || ' added to your wallet!', 'amount', v_gift.amount);
END;
$$;
