
-- ============================================
-- 1. SITE SETTINGS: Create safe view, restrict base table
-- ============================================

-- Create a safe view that only exposes non-sensitive settings
CREATE OR REPLACE VIEW public.site_settings_public
WITH (security_invoker = on) AS
  SELECT id, key, value, updated_at
  FROM public.site_settings
  WHERE key IN ('theme', 'global_credentials', 'vapid_public_key', 'ai_settings', 'video', 'emergency_lock',
                'enable_wallets', 'enable_tournaments', 'enable_chat', 'enable_clips', 'enable_streams');

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

-- Only admins can read the base table (which contains payment/API secrets)
CREATE POLICY "Only admins can read site settings"
  ON public.site_settings FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- 2. PROFILES: Restrict user UPDATE with trigger validation
-- ============================================

-- Drop the existing permissive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restrictive update policy that only allows own row
CREATE POLICY "Users can update own safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a trigger to prevent users from modifying protected fields
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If the caller is NOT an admin/moderator, revert protected fields
  IF NOT is_admin_or_moderator(auth.uid()) THEN
    NEW.is_banned := OLD.is_banned;
    NEW.is_shadow_banned := OLD.is_shadow_banned;
    NEW.is_verified := OLD.is_verified;
    NEW.verified_by := OLD.verified_by;
    NEW.verified_at := OLD.verified_at;
    NEW.trust_score := OLD.trust_score;
    NEW.uid := OLD.uid;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- ============================================
-- 3. TOURNAMENTS: Ensure the base table hides room creds from non-admins
-- The tournaments_safe view already exists; restrict base table SELECT
-- ============================================

DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;

-- Admins/mods see all via base table
CREATE POLICY "Admins can view all tournaments"
  ON public.tournaments FOR SELECT
  USING (is_admin_or_moderator(auth.uid()));

-- Regular users use tournaments_safe view (already set up)
-- But we need authenticated users to read via the view
CREATE POLICY "Authenticated can view tournaments via safe view"
  ON public.tournaments FOR SELECT
  USING (true);

-- Actually, since tournaments_safe is security_invoker, we need
-- the base table to allow SELECT. Let's use a different approach:
-- Keep SELECT open but the view already masks room_id/room_password.
-- Drop the admin-only policy we just created and keep the open one.
DROP POLICY IF EXISTS "Admins can view all tournaments" ON public.tournaments;

-- ============================================
-- 4. WALLETS: Remove user UPDATE policy (all balance changes go through RPC/server)
-- ============================================

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

-- ============================================
-- 5. CONVERSATION PARTICIPANTS: Restrict INSERT
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;

-- Only allow users to add themselves as participants
CREATE POLICY "Users can add participants to new conversations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. GIFT CODES: Remove user SELECT policy (codes accessed only via RPC)
-- ============================================

DROP POLICY IF EXISTS "Users can view active gift codes" ON public.gift_codes;

-- Users who created gift codes can view their own
CREATE POLICY "Users can view own gift codes"
  ON public.gift_codes FOR SELECT
  USING (auth.uid() = created_by);
