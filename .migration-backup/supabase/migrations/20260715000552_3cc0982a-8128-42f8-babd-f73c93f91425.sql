-- Remove public unauthenticated read access to profiles (exposes emails, ban reasons, etc.)
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

-- Only authenticated users may read profile rows.
CREATE POLICY profiles_select_authenticated
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Revoke anonymous grant so anon key holders cannot read the base table.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;