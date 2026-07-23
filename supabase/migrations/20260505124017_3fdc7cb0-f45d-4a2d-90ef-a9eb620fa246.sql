ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_premium FROM public.profiles WHERE user_id = _user_id), false)
$$;