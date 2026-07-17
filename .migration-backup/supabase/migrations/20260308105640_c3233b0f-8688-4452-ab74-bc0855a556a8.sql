
-- Create APK releases table
CREATE TABLE public.apk_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT '1.0.0',
  file_size text NOT NULL DEFAULT '50 MB',
  file_url text,
  min_android text NOT NULL DEFAULT 'Android 7.0+',
  release_notes text,
  download_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apk_releases ENABLE ROW LEVEL SECURITY;

-- Anyone can read the latest APK info (public download page)
CREATE POLICY "Anyone can view APK releases" ON public.apk_releases
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage APK releases" ON public.apk_releases
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create storage bucket for APK files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('apk-files', 'apk-files', true, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for APK bucket
CREATE POLICY "Anyone can download APK files" ON storage.objects
  FOR SELECT USING (bucket_id = 'apk-files');

CREATE POLICY "Admins can upload APK files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'apk-files' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update APK files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'apk-files' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete APK files" ON storage.objects
  FOR DELETE USING (bucket_id = 'apk-files' AND is_admin(auth.uid()));
