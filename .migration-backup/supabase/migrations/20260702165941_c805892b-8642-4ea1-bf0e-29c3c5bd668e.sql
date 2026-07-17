-- Moderator duties/permissions assignment
CREATE TABLE public.moderator_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moderator_id, permission)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderator_permissions TO authenticated;
GRANT ALL ON public.moderator_permissions TO service_role;

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage moderator permissions"
  ON public.moderator_permissions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Moderators can view their own assigned permissions
CREATE POLICY "Moderators view own permissions"
  ON public.moderator_permissions FOR SELECT
  USING (moderator_id = auth.uid());

CREATE TRIGGER update_moderator_permissions_updated_at
  BEFORE UPDATE ON public.moderator_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_moderator_permissions_mod ON public.moderator_permissions(moderator_id);
