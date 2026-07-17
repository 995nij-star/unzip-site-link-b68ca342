-- Create profile likes table
CREATE TABLE public.profile_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent duplicate likes
  UNIQUE(user_id, profile_user_id),
  -- Prevent self-likes
  CHECK (user_id != profile_user_id)
);

-- Enable RLS
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes (for counting)
CREATE POLICY "Anyone can view likes"
ON public.profile_likes
FOR SELECT
TO authenticated
USING (true);

-- Users can like profiles
CREATE POLICY "Users can like profiles"
ON public.profile_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike profiles"
ON public.profile_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_profile_likes_profile_user_id ON public.profile_likes(profile_user_id);
CREATE INDEX idx_profile_likes_user_id ON public.profile_likes(user_id);

-- Add likes_count to the player_leaderboard view
DROP VIEW IF EXISTS public.player_leaderboard; -- @allow-destructive (historical view recreation)

CREATE VIEW public.player_leaderboard
WITH (security_invoker = on) AS
SELECT 
  p.user_id,
  p.username,
  p.avatar_url,
  p.uid,
  COALESCE(COUNT(DISTINCT tp.tournament_id), 0) as tournaments_played,
  0::bigint as wins,
  COALESCE(SUM(
    CASE 
      WHEN wt.type = 'prize' THEN wt.amount 
      ELSE 0 
    END
  ), 0) as total_earnings,
  COALESCE(likes.like_count, 0) as likes_count
FROM public.profiles p
LEFT JOIN public.tournament_participants tp ON p.user_id = tp.user_id
LEFT JOIN public.wallet_transactions wt ON p.user_id = wt.user_id AND wt.type = 'prize'
LEFT JOIN (
  SELECT profile_user_id, COUNT(*) as like_count 
  FROM public.profile_likes 
  GROUP BY profile_user_id
) likes ON p.user_id = likes.profile_user_id
GROUP BY p.user_id, p.username, p.avatar_url, p.uid, likes.like_count
ORDER BY total_earnings DESC, wins DESC, tournaments_played DESC;