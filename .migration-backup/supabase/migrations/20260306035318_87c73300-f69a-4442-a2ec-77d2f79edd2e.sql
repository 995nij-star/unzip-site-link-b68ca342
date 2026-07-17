
-- Drop the security definer view - we'll handle credential hiding in application code
DROP VIEW IF EXISTS public.tournaments_public; -- @allow-destructive (historical view recreation)

-- Create the view with SECURITY INVOKER (safe)
CREATE OR REPLACE VIEW public.tournaments_safe WITH (security_invoker = true) AS
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
