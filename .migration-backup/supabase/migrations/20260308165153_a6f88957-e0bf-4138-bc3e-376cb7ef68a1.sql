
-- Table to track admin-managed account locks
CREATE TABLE public.account_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  is_locked boolean NOT NULL DEFAULT true,
  locked_by uuid NULL,
  lock_reason text NULL,
  auto_locked boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  unlocked_at timestamp with time zone NULL,
  unlocked_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage account locks"
  ON public.account_locks FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Moderators can view account locks"
  ON public.account_locks FOR SELECT
  USING (is_admin_or_moderator(auth.uid()));
