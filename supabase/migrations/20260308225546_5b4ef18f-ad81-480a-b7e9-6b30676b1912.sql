
DROP VIEW IF EXISTS public.profiles_public; -- @allow-destructive (historical view recreation)

CREATE VIEW public.profiles_public AS
SELECT
  id,
  user_id,
  username,
  avatar_url,
  uid,
  free_fire_uid,
  is_verified,
  verified_at,
  created_at,
  updated_at,
  last_seen
FROM public.profiles;
