
-- ============================================
-- 1. FIX: Tournament room passwords readable by anonymous users
-- Restrict base table SELECT to authenticated only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view tournaments" ON public.tournaments;

CREATE POLICY "Authenticated can view tournaments"
  ON public.tournaments FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 2. FIX: Profiles PII - ensure own-row + admin access + system view
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Own profile: full access
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins/mods: full access
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- ============================================
-- 3. FIX: Wallet arbitrary balance INSERT
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;
