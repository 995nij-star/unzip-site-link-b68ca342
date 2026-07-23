
-- Public-ish buckets: anyone can read; authenticated users can upload/manage their own folder
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "auth_write_avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "auth_upd_avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "auth_del_avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "public_read_clips" ON storage.objects FOR SELECT USING (bucket_id='clips');
CREATE POLICY "auth_write_clips" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='clips' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "auth_upd_clips" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='clips' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "auth_del_clips" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='clips' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "public_read_site_assets" ON storage.objects FOR SELECT USING (bucket_id='site-assets');
CREATE POLICY "admin_write_site_assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='site-assets' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "admin_upd_site_assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='site-assets' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "admin_del_site_assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='site-assets' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "kyc_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='kyc' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "kyc_write_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='kyc' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc_upd_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='kyc' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc_del_admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='kyc' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
