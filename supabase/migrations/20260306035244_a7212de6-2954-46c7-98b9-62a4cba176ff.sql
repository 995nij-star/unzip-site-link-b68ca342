
-- Fix the tournament policy - RLS can't do column-level security, so revert to simple policy
-- and use a secure view instead
DROP POLICY IF EXISTS "Public can view tournaments without credentials" ON public.tournaments;

CREATE POLICY "Anyone can view tournaments"
ON public.tournaments FOR SELECT
USING (true);

-- Create a secure view that hides credentials from non-participants
CREATE OR REPLACE VIEW public.tournaments_public AS
SELECT 
  id, title, description, game, entry_fee, prize_pool, 
  max_players, current_players, start_time, status, 
  created_at, updated_at, image_url,
  CASE 
    WHEN auth.uid() IN (SELECT user_id FROM public.tournament_participants WHERE tournament_id = tournaments.id)
      OR public.is_admin(auth.uid())
    THEN room_id 
    ELSE NULL 
  END as room_id,
  CASE 
    WHEN auth.uid() IN (SELECT user_id FROM public.tournament_participants WHERE tournament_id = tournaments.id)
      OR public.is_admin(auth.uid())
    THEN room_password 
    ELSE NULL 
  END as room_password
FROM public.tournaments;
