-- Create ban audit log table
CREATE TABLE public.ban_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ban', 'unban')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ban_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view ban audit logs
CREATE POLICY "Admins can view ban audit logs"
ON public.ban_audit_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Only admins can insert ban audit logs
CREATE POLICY "Admins can insert ban audit logs"
ON public.ban_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_ban_audit_log_user_id ON public.ban_audit_log(user_id);
CREATE INDEX idx_ban_audit_log_admin_id ON public.ban_audit_log(admin_id);
CREATE INDEX idx_ban_audit_log_created_at ON public.ban_audit_log(created_at DESC);