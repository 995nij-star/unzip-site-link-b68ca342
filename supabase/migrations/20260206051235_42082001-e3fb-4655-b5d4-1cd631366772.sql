-- Create topup_requests table for UPI payment requests
CREATE TABLE public.topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  utr VARCHAR(50) NOT NULL,
  screenshot_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_topup_requests_user_id ON public.topup_requests(user_id);
CREATE INDEX idx_topup_requests_status ON public.topup_requests(status);

-- Enable Row Level Security
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own topup requests
CREATE POLICY "Users can view their own topup requests"
ON public.topup_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own topup requests
CREATE POLICY "Users can create their own topup requests"
ON public.topup_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all topup requests
CREATE POLICY "Admins can view all topup requests"
ON public.topup_requests
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update topup requests (approve/reject)
CREATE POLICY "Admins can update topup requests"
ON public.topup_requests
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_topup_requests_updated_at
BEFORE UPDATE ON public.topup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a storage bucket for topup screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('topup-screenshots', 'topup-screenshots', false)
ON CONFLICT DO NOTHING;

-- Storage policies for topup screenshots
CREATE POLICY "Users can upload their own topup screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'topup-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own topup screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'topup-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all topup screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'topup-screenshots' AND public.is_admin(auth.uid()));