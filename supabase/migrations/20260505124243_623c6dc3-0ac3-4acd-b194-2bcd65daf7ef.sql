CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid, p_player_name text DEFAULT NULL::text, p_game_uid text DEFAULT NULL::text, p_phone_number text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID; v_entry_fee DECIMAL(10,2); v_current_balance DECIMAL(10,2);
  v_current_players INTEGER; v_max_players INTEGER; v_tournament_status TEXT;
  v_is_premium BOOLEAN; v_charged_fee DECIMAL(10,2); v_discount DECIMAL(10,2);
  v_premium_slot BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT entry_fee, current_players, max_players, status
    INTO v_entry_fee, v_current_players, v_max_players, v_tournament_status
  FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;

  IF v_tournament_status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  v_is_premium := public.is_premium(v_user_id);

  -- Cap check: premium users get one reserved overflow slot
  IF v_current_players >= v_max_players THEN
    IF v_is_premium AND v_current_players < v_max_players + 1 THEN
      v_premium_slot := true;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Tournament is full');
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already joined this tournament');
  END IF;

  -- Apply 10% premium discount
  IF v_is_premium THEN
    v_discount := ROUND(v_entry_fee * 0.10, 2);
    v_charged_fee := v_entry_fee - v_discount;
  ELSE
    v_discount := 0;
    v_charged_fee := v_entry_fee;
  END IF;

  SELECT balance INTO v_current_balance FROM public.wallets WHERE user_id = v_user_id;
  IF v_current_balance IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (v_user_id, 0.00);
    v_current_balance := 0.00;
  END IF;

  IF v_current_balance < v_charged_fee THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.wallets SET balance = balance - v_charged_fee, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (
    v_user_id,
    -v_charged_fee,
    'entry_fee',
    CASE WHEN v_is_premium THEN 'Tournament entry fee (Premium 10% off)' ELSE 'Tournament entry fee' END,
    p_tournament_id
  );
  INSERT INTO public.tournament_participants (tournament_id, user_id, player_name, game_uid, phone_number)
  VALUES (p_tournament_id, v_user_id, p_player_name, p_game_uid, p_phone_number);
  UPDATE public.tournaments SET current_players = current_players + 1, updated_at = now() WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined tournament',
    'is_premium', v_is_premium,
    'charged_fee', v_charged_fee,
    'discount', v_discount,
    'premium_slot', v_premium_slot
  );
END;
$function$;