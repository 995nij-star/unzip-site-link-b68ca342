
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;
