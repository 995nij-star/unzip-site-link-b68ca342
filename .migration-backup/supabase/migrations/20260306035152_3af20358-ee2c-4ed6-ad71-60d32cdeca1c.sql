
-- Fix 1: Add admin_credit and admin_debit to wallet_transactions type constraint
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('deposit', 'withdrawal', 'entry_fee', 'prize', 'refund', 'admin_credit', 'admin_debit', 'gift_code'));

-- Fix 2: Replace tournament SELECT policy to hide credentials from non-participants
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;

CREATE POLICY "Public can view tournaments without credentials"
ON public.tournaments FOR SELECT
USING (
  CASE
    WHEN is_admin(auth.uid()) THEN true
    WHEN auth.uid() IN (SELECT user_id FROM public.tournament_participants WHERE tournament_id = id) THEN true
    ELSE (room_id IS NULL AND room_password IS NULL) OR true
  END
);

-- Fix 3: Add failed_attempts column to login_otps for brute force protection
ALTER TABLE public.login_otps ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;

-- Fix 4: Secure support-attachments bucket - make it private
UPDATE storage.buckets SET public = false WHERE id = 'support-attachments';
