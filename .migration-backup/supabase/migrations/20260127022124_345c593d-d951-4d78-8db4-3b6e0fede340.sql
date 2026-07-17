-- Drop and recreate the player_leaderboard view to include UID
DROP VIEW IF EXISTS public.player_leaderboard; -- @allow-destructive (historical view recreation)

CREATE VIEW public.player_leaderboard
WITH (security_invoker = on) AS
SELECT 
  p.user_id,
  p.username,
  p.uid,
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
  SELECT user_id, COUNT(*) as total_wins
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) wins ON p.user_id = wins.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_earnings
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) earnings ON p.user_id = earnings.user_id
ORDER BY total_earnings DESC, wins DESC, tournaments_played DESC;