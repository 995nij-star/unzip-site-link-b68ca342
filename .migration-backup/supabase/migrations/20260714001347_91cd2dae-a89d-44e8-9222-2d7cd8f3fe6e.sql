
DO $$ BEGIN
  CREATE POLICY "topup screenshots owner upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'topup-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "topup screenshots read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'topup-screenshots' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
