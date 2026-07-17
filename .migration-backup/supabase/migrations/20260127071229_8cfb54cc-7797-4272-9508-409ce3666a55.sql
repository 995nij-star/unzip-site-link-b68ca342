-- Add last_seen column to profiles for online status tracking
ALTER TABLE public.profiles
ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries on last_seen
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen DESC);