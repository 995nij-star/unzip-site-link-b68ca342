-- Fix UID: change from 10-digit to 8-digit generation
-- Also fixes two bugs that prevented frontend auto-assignment:
--   1. generate_unique_uid() had no GRANT EXECUTE for authenticated users → silent RPC failure
--   2. protect_profile_fields trigger blocked uid UPDATE even for initial (NULL → value) assignment

-- Step 1: Update the generation function to produce 8-digit UIDs
CREATE OR REPLACE FUNCTION public.generate_unique_uid()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_uid TEXT; uid_exists BOOLEAN;
BEGIN
  LOOP
    -- 8-digit range: 10000000 to 99999999
    new_uid := LPAD(FLOOR(RANDOM() * 90000000 + 10000000)::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE uid = new_uid) INTO uid_exists;
    EXIT WHEN NOT uid_exists;
  END LOOP;
  RETURN new_uid;
END; $$;

-- Step 2: Grant EXECUTE to authenticated users so the frontend RPC call works
GRANT EXECUTE ON FUNCTION public.generate_unique_uid() TO authenticated;

-- Step 3: Update protect_profile_fields to allow initial uid assignment (NULL → value),
-- while still preventing non-admins from changing an already-set uid
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT is_admin_or_moderator(auth.uid()) THEN
    NEW.is_banned        := OLD.is_banned;
    NEW.is_shadow_banned := OLD.is_shadow_banned;
    NEW.is_verified      := OLD.is_verified;
    NEW.verified_by      := OLD.verified_by;
    NEW.verified_at      := OLD.verified_at;
    NEW.trust_score      := OLD.trust_score;
    -- Allow setting uid for the first time (NULL → value); block changes to an existing uid
    IF OLD.uid IS NOT NULL THEN
      NEW.uid := OLD.uid;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Step 4: Reassign ALL profiles to fresh 8-digit UIDs
-- Clear first so collision detection inside generate_unique_uid() works cleanly
UPDATE public.profiles SET uid = NULL;
UPDATE public.profiles SET uid = public.generate_unique_uid() WHERE uid IS NULL;
