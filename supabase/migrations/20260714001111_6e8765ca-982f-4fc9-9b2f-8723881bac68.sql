
ALTER TABLE public.topup_requests ALTER COLUMN method SET DEFAULT 'upi';
UPDATE public.topup_requests SET method = 'upi' WHERE method IS NULL;

CREATE TABLE IF NOT EXISTS public.login_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_otps_email_idx ON public.login_otps(email);
GRANT ALL ON public.login_otps TO service_role;
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_otps_email_idx ON public.password_reset_otps(email);
GRANT ALL ON public.password_reset_otps TO service_role;
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
