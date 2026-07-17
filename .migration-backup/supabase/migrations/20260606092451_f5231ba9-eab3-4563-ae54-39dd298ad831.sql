ALTER TABLE public.kyc_verifications ADD COLUMN IF NOT EXISTS ai_notes text;

GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;