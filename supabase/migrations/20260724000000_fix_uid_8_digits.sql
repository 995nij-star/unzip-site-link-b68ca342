-- Fix UID to 8 digits (was 10 digits)
-- Step 1: Update the generation function to produce 8-digit UIDs
CREATE OR REPLACE FUNCTION public.generate_unique_uid()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_uid TEXT; uid_exists BOOLEAN;
BEGIN
  LOOP
    new_uid := LPAD(FLOOR(RANDOM() * 90000000 + 10000000)::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE uid = new_uid) INTO uid_exists;
    EXIT WHEN NOT uid_exists;
  END LOOP;
  RETURN new_uid;
END; $$;

-- Step 2: Reassign all existing profiles (both NULL and 10-digit) to new unique 8-digit UIDs.
-- We clear all UIDs first so collision detection works correctly (no old value blocks a new one).
UPDATE public.profiles SET uid = NULL;
UPDATE public.profiles SET uid = public.generate_unique_uid() WHERE uid IS NULL;
