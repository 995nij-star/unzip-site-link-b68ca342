
-- Add attachment columns to direct_messages
ALTER TABLE public.direct_messages 
  ADD COLUMN attachment_url text,
  ADD COLUMN attachment_type text;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true);

-- RLS policies for the bucket
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
