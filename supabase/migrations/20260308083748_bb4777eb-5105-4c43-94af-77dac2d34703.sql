
-- Create moderator applications table
CREATE TABLE public.mod_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  experience text NOT NULL,
  gaming_knowledge text NOT NULL DEFAULT 'intermediate',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mod_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON public.mod_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own application
CREATE POLICY "Users can submit applications"
  ON public.mod_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.mod_applications FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update applications
CREATE POLICY "Admins can update applications"
  ON public.mod_applications FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Admins can delete applications
CREATE POLICY "Admins can delete applications"
  ON public.mod_applications FOR DELETE
  USING (public.is_admin(auth.uid()));
