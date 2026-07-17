-- Create wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  game TEXT NOT NULL,
  entry_fee DECIMAL(10,2) NOT NULL DEFAULT 30.00,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_players INTEGER NOT NULL DEFAULT 100,
  current_players INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  room_id TEXT,
  room_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament_participants table
CREATE TABLE public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'entry_fee', 'prize', 'refund')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallet RLS policies
CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tournament RLS policies (public read, admin write - for now public write for demo)
CREATE POLICY "Anyone can view tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Tournament update policy"
  ON public.tournaments FOR UPDATE
  USING (true);

-- Tournament participants RLS policies
CREATE POLICY "Users can view tournament participants"
  ON public.tournament_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join tournaments"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave tournaments"
  ON public.tournament_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Wallet transactions RLS policies
CREATE POLICY "Users can view their own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle wallet creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 100.00);
  RETURN NEW;
END;
$$;

-- Create trigger for wallet creation
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Create function to join tournament and deduct balance
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Add participant
  INSERT INTO public.tournament_participants (tournament_id, user_id) VALUES (p_tournament_id, v_user_id);

  -- Update tournament player count
  UPDATE public.tournaments SET current_players = current_players + 1, updated_at = now() WHERE id = p_tournament_id;

  RETURN json_build_object('success', true, 'message', 'Successfully joined tournament');
END;
$$;

-- Update timestamps trigger
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();