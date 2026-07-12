-- =========================================
-- 1. STORAGE: support-attachments
-- =========================================
DROP POLICY IF EXISTS "Anyone can view support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all support attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own support attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all support attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND public.is_admin_or_moderator(auth.uid())
);

-- =========================================
-- 2. STORAGE: message-attachments
-- =========================================
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all message attachments" ON storage.objects;

CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Conversation participants can view message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  -- Owner can always see their uploaded files
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin_or_moderator(auth.uid())
  )
);

-- =========================================
-- 3. STORAGE: ususer (lock down if exists)
-- =========================================
DROP POLICY IF EXISTS "Deny all on ususer" ON storage.objects;
CREATE POLICY "Deny all on ususer"
ON storage.objects FOR ALL TO public
USING (bucket_id <> 'ususer')
WITH CHECK (bucket_id <> 'ususer');

-- =========================================
-- 4. TOURNAMENTS: hide room credentials from non-participants
-- =========================================
DROP POLICY IF EXISTS "Authenticated can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Participants and admins can view tournaments with credentials" ON public.tournaments;

-- Only participants and admins can SELECT the base table (which contains room_id/room_password).
-- All other access must go through the `tournaments_safe` view (which masks credentials).
CREATE POLICY "Participants and admins can view tournaments with credentials"
ON public.tournaments FOR SELECT TO authenticated
USING (
  public.is_admin_or_moderator(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tournament_participants tp
    WHERE tp.tournament_id = tournaments.id
      AND tp.user_id = auth.uid()
  )
);

-- =========================================
-- 5. GIFT CODES: tighten enumeration
-- =========================================
-- Backfill any orphaned codes to a sentinel admin (so NOT NULL doesn't break)
-- Skip if already non-null
UPDATE public.gift_codes
SET created_by = (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;

ALTER TABLE public.gift_codes
  ALTER COLUMN created_by SET NOT NULL;

-- Existing "Users can view own gift codes" policy stays; it filters by created_by.
-- Now that created_by is NOT NULL, no orphan rows can leak.

-- =========================================
-- 6. USER_ROLES: explicit hardening
-- =========================================
-- Ensure no INSERT/UPDATE/DELETE policy exists for non-admins (defense in depth)
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;
CREATE POLICY "Only admins can manage user roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));