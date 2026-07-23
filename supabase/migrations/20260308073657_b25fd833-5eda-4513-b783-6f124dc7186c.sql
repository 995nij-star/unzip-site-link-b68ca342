
-- Function to let users create gift codes from their wallet balance
CREATE OR REPLACE FUNCTION public.create_user_gift_code(p_amount numeric, p_max_uses integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_code text;
  v_code_exists boolean;
  v_gift_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate amount
  IF p_amount < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum amount is ₹10');
  END IF;

  IF p_max_uses < 1 OR p_max_uses > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Max uses must be between 1 and 100');
  END IF;

  -- Total cost = amount * max_uses
  DECLARE v_total_cost numeric := p_amount * p_max_uses;
  BEGIN
    -- Check wallet balance
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id;
    IF v_balance IS NULL OR v_balance < v_total_cost THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance. Total cost: ₹' || v_total_cost);
    END IF;

    -- Generate unique code
    LOOP
      v_code := 'GC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM public.gift_codes WHERE code = v_code) INTO v_code_exists;
      EXIT WHEN NOT v_code_exists;
    END LOOP;

    -- Deduct from wallet
    UPDATE public.wallets SET balance = balance - v_total_cost, updated_at = now() WHERE user_id = v_user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, -v_total_cost, 'gift_code', 'Created gift code: ' || v_code);

    -- Create gift code (expires in 30 days)
    INSERT INTO public.gift_codes (code, amount, max_uses, expiry, created_by, is_active)
    VALUES (v_code, p_amount, p_max_uses, now() + interval '30 days', v_user_id, true)
    RETURNING id INTO v_gift_id;

    RETURN json_build_object('success', true, 'code', v_code, 'amount', p_amount, 'max_uses', p_max_uses, 'total_cost', v_total_cost);
  END;
END;
$$;
