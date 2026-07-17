
-- ============================================
-- 1. FIX: login_otps - RLS enabled but no policies
-- Edge functions need to INSERT/SELECT/UPDATE, users should not access directly
-- ============================================
CREATE POLICY "Service role only for login_otps"
  ON public.login_otps FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 2. FIX: conversations - INSERT WITH CHECK (true) is too permissive
-- Users should only create conversations through the start_conversation RPC
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "System can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (false);

-- ============================================
-- 3. FIX: Duplicate tournament INSERT policies (Admins + Moderators both do the same)
-- ============================================
DROP POLICY IF EXISTS "Moderators can create tournaments" ON public.tournaments;

-- ============================================
-- 4. HARDEN: Restrict profiles SELECT to only needed columns
-- We can't use USING(false) because too many queries depend on it.
-- Instead, we ensure the profiles_public view is the recommended path
-- and the protect_profile_fields trigger prevents privilege escalation.
-- But we CAN revoke direct anon access to the base table.
-- ============================================
-- Ensure no anon/public SELECT exists on profiles (only authenticated)
-- Already correct: policy is on {authenticated} role only.

-- ============================================
-- 5. FIX: Ensure wallet INSERT is only via trigger (verify no user policy)
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;

-- ============================================
-- 6. FIX: Ensure no user INSERT on wallet_transactions
-- ============================================
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
