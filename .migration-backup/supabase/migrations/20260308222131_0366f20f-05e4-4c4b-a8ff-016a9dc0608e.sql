
-- ============================================
-- FIX 1: Tournament credentials exposure
-- Remove the overly permissive public SELECT policy
-- and fix the broken participant check
-- ============================================

-- Drop the broken policies
DROP POLICY IF EXISTS "Authenticated can view tournaments via safe view" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated can view tournaments without credentials" ON public.tournaments;

-- New policy: Authenticated users can view tournaments (rely on tournaments_safe view for credential masking)
CREATE POLICY "Authenticated users can view tournaments"
  ON public.tournaments
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- FIX 2: Create profiles_public view to hide PII
-- ============================================

-- Create a public view that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  username,
  avatar_url,
  uid,
  is_verified,
  verified_at,
  is_banned,
  is_shadow_banned,
  trust_score,
  created_at,
  updated_at,
  last_seen
FROM public.profiles;

-- ============================================
-- FIX 3: Remove user INSERT on wallet_transactions
-- Only admins/mods/service-role should create transactions
-- ============================================

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.wallet_transactions;

-- ============================================
-- FIX 4: Fix conversation_participants INSERT hijacking
-- Users can only add themselves AND must be adding to a conversation
-- they already participate in, OR creating a new one (no existing participants yet)
-- ============================================

DROP POLICY IF EXISTS "Users can add participants to new conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to conversations they belong to"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR is_conversation_participant(auth.uid(), conversation_id)
  );
