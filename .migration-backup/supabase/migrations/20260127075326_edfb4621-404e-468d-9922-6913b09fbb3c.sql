-- Create site_settings table for theme configuration
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (for theme application)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only admins can insert site settings
CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default theme settings
INSERT INTO public.site_settings (key, value) VALUES 
('theme', '{
  "primaryColor": "210 100% 55%",
  "secondaryColor": "220 15% 15%",
  "backgroundColor": "220 20% 4%",
  "buttonColor": "210 100% 55%",
  "logoUrl": null,
  "bannerUrl": null,
  "darkMode": true
}'::jsonb);

-- Create storage bucket for site assets
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true);

-- Allow anyone to view site assets
CREATE POLICY "Anyone can view site assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-assets');

-- Only admins can upload site assets
CREATE POLICY "Admins can upload site assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));

-- Only admins can update site assets
CREATE POLICY "Admins can update site assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));

-- Only admins can delete site assets
CREATE POLICY "Admins can delete site assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'site-assets' AND public.is_admin(auth.uid()));