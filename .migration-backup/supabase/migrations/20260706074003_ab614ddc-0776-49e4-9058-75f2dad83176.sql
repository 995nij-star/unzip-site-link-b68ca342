
CREATE OR REPLACE FUNCTION public.wallet_hold_transfer(_amount numeric, _ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0);
    _bal := 0;
  END IF;
  IF _bal < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.wallets SET balance = balance - _amount, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (_uid, -_amount, 'admin_debit', 'Money transfer hold · ' || _ref);
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_refund_transfer(_amount numeric, _ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (_uid, _amount, 'refund', 'Money transfer refund · ' || _ref);
END; $$;

REVOKE ALL ON FUNCTION public.wallet_hold_transfer(numeric, text) FROM public;
REVOKE ALL ON FUNCTION public.wallet_refund_transfer(numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.wallet_hold_transfer(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_refund_transfer(numeric, text) TO authenticated;
