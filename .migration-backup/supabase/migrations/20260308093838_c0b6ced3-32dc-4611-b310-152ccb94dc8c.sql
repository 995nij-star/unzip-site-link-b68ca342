
-- Create user_follows table for follow system
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see follows
CREATE POLICY "Anyone can view follows"
  ON public.user_follows FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND auth.uid() != following_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);
