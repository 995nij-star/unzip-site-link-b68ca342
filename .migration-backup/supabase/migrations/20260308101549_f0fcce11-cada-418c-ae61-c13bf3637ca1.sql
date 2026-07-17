
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view tournament participants" ON public.tournament_participants;

-- Users can view their own participation
CREATE POLICY "Users can view own participation"
  ON public.tournament_participants FOR SELECT
  USING (auth.uid() = user_id);

-- Admins/moderators can view all participants
CREATE POLICY "Admins can view all participants"
  ON public.tournament_participants FOR SELECT
  USING (is_admin_or_moderator(auth.uid()));
