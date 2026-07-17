CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  document_type text NOT NULL,
  document_number text,
  document_url text NOT NULL,
  selfie_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own KYC"
ON public.kyc_verifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own KYC"
ON public.kyc_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can re-submit (update) only when their KYC was rejected or pending
CREATE POLICY "Users update own pending or rejected KYC"
ON public.kyc_verifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status IN ('pending','rejected'))
WITH CHECK (auth.uid() = user_id AND status IN ('pending','rejected'));

CREATE POLICY "Admins view all KYC"
ON public.kyc_verifications FOR SELECT TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins update KYC"
ON public.kyc_verifications FOR UPDATE TO authenticated
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_verifications(status, submitted_at DESC);

-- Trigger: notify user when KYC is approved/rejected
CREATE OR REPLACE FUNCTION public.notify_kyc_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (NEW.user_id, 'kyc_approved', 'KYC Approved ✅', 'Your identity has been verified. You can now withdraw funds.');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (NEW.user_id, 'kyc_rejected', 'KYC Rejected', COALESCE(NEW.rejection_reason, 'Please re-submit with clearer documents.'));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_kyc_status_change
AFTER UPDATE ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_kyc_status_change();
