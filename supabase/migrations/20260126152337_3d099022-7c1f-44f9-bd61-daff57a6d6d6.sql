-- Create table for storing login OTPs
CREATE TABLE public.login_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_login_otps_email ON public.login_otps(email);
CREATE INDEX idx_login_otps_expires ON public.login_otps(expires_at);

-- Enable RLS
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role can access
-- This is intentional for security