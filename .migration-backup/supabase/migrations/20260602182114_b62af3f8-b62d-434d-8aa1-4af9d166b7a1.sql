CREATE POLICY "KYC: users upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "KYC: users read own folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "KYC: users update own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "KYC: admins read all"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND public.is_admin_or_moderator(auth.uid()));
