-- Add a 10-digit unique UID to profiles table
ALTER TABLE public.profiles 
ADD COLUMN uid TEXT UNIQUE;

-- Create function to generate a unique 10-digit UID
CREATE OR REPLACE FUNCTION public.generate_unique_uid()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_uid TEXT;
  uid_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 10-digit number (1000000000 to 9999999999)
    new_uid := LPAD(FLOOR(RANDOM() * 9000000000 + 1000000000)::TEXT, 10, '0');
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE uid = new_uid) INTO uid_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT uid_exists;
  END LOOP;
  
  RETURN new_uid;
END;
$$;

-- Create trigger function to auto-assign UID on profile creation
CREATE OR REPLACE FUNCTION public.assign_uid_on_profile_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.uid IS NULL THEN
    NEW.uid := public.generate_unique_uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_profile_uid
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_uid_on_profile_create();

-- Backfill existing profiles with UIDs
UPDATE public.profiles 
SET uid = public.generate_unique_uid() 
WHERE uid IS NULL;