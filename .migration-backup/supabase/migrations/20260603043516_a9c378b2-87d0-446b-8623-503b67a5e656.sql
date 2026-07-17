-- Allow authenticated users to insert their own audit log entries
CREATE POLICY "Users can insert own audit log entries"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id);