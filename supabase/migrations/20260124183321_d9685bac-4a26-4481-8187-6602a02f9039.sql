-- Fix the overly permissive tournament update policy
DROP POLICY IF EXISTS "Tournament update policy" ON public.tournaments;

-- Only allow updates via the security definer function (no direct updates)
CREATE POLICY "No direct tournament updates"
  ON public.tournaments FOR UPDATE
  USING (false);