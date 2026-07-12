CREATE TABLE IF NOT EXISTS public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  city text,
  region text,
  country text,
  permission_status text NOT NULL DEFAULT 'prompt',
  permission_asked_at timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location"
ON public.user_locations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location"
ON public.user_locations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
ON public.user_locations FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can view all locations"
ON public.user_locations FOR SELECT TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON public.user_locations(last_updated_at DESC);
