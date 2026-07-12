CREATE POLICY "Admins update any api key" ON public.developer_api_keys
  FOR UPDATE TO authenticated
  USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins delete any api key" ON public.developer_api_keys
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));