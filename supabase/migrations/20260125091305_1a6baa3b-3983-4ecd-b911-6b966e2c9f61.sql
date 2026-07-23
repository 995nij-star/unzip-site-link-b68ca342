-- Create a view to aggregate player leaderboard stats
-- This combines profile data with tournament participation and wallet transactions

CREATE OR REPLACE VIEW public.player_leaderboard AS
SELECT 
  p.user_id,
  p.username,
  p.avatar_url,
  COALESCE(tp.tournaments_played, 0) as tournaments_played,
  COALESCE(wins.total_wins, 0) as wins,
  COALESCE(earnings.total_earnings, 0) as total_earnings
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as tournaments_played
  FROM public.tournament_participants
  GROUP BY user_id
) tp ON p.user_id = tp.user_id
LEFT JOIN (
  -- Count wins from prize transactions (positive amounts with type 'prize')
  SELECT user_id, COUNT(*) as total_wins
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) wins ON p.user_id = wins.user_id
LEFT JOIN (
  -- Sum all prize earnings
  SELECT user_id, SUM(amount) as total_earnings
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) earnings ON p.user_id = earnings.user_id
ORDER BY total_earnings DESC, wins DESC, tournaments_played DESC;