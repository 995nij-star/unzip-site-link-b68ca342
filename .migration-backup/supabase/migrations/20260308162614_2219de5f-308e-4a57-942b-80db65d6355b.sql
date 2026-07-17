-- Fix 1: Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Remove OR true bug from tournaments SELECT policy
DROP POLICY IF EXISTS "Public can view tournaments without credentials" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated can view tournaments without credentials" ON public.tournaments;

CREATE POLICY "Authenticated can view tournaments without credentials"
  ON public.tournaments FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN is_admin(auth.uid()) THEN true
      WHEN auth.uid() IN (
        SELECT user_id FROM public.tournament_participants WHERE tournament_id = id
      ) THEN true
      ELSE (room_id IS NULL AND room_password IS NULL)
    END
  );