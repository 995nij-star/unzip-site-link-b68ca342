-- Add player game details and winner status to tournament_participants
ALTER TABLE public.tournament_participants
ADD COLUMN player_name TEXT,
ADD COLUMN game_uid TEXT,
ADD COLUMN is_winner BOOLEAN DEFAULT false;

-- Update the join_tournament function to accept player details
CREATE OR REPLACE FUNCTION public.join_tournament(
  p_tournament_id uuid,
  p_player_name text DEFAULT NULL,
  p_game_uid text DEFAULT NULL
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_entry_fee DECIMAL(10,2);
  v_current_balance DECIMAL(10,2);
  v_current_players INTEGER;
  v_max_players INTEGER;
  v_tournament_status TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get tournament details
  SELECT entry_fee, current_players, max_players, status 
  INTO v_entry_fee, v_current_players, v_max_players, v_tournament_status
  FROM public.tournaments WHERE id = p_tournament_id;

  IF v_tournament_status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  IF v_current_players >= v_max_players THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  -- Check if already joined
  IF EXISTS (SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already joined this tournament');
  END IF;

  -- Get user wallet balance
  SELECT balance INTO v_current_balance FROM public.wallets WHERE user_id = v_user_id;

  IF v_current_balance IS NULL THEN
    -- Create wallet if doesn't exist
    INSERT INTO public.wallets (user_id, balance) VALUES (v_user_id, 100.00);
    v_current_balance := 100.00;
  END IF;

  IF v_current_balance < v_entry_fee THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct entry fee
  UPDATE public.wallets SET balance = balance - v_entry_fee, updated_at = now() WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, -v_entry_fee, 'entry_fee', 'Tournament entry fee', p_tournament_id);

  -- Add participant with game details
  INSERT INTO public.tournament_participants (tournament_id, user_id, player_name, game_uid)
  VALUES (p_tournament_id, v_user_id, p_player_name, p_game_uid);

  -- Update tournament player count
  UPDATE public.tournaments SET current_players = current_players + 1, updated_at = now() WHERE id = p_tournament_id;

  RETURN json_build_object('success', true, 'message', 'Successfully joined tournament');
END;
$function$;

-- Allow admins to update participant winner status
CREATE POLICY "Admins can update tournament participants"
ON public.tournament_participants
FOR UPDATE
USING (is_admin(auth.uid()));