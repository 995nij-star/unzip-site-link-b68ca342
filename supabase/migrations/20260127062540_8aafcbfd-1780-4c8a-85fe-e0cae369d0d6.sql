-- Create storage bucket for support ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true);

-- Allow anyone to upload to support-attachments bucket
CREATE POLICY "Anyone can upload support attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'support-attachments');

-- Allow anyone to view support attachments
CREATE POLICY "Anyone can view support attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'support-attachments');

-- Allow admins to delete support attachments
CREATE POLICY "Admins can delete support attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'support-attachments' AND is_admin(auth.uid()));

-- Add screenshot_urls column to support_tickets table
ALTER TABLE public.support_tickets
ADD COLUMN screenshot_urls TEXT[] DEFAULT '{}';