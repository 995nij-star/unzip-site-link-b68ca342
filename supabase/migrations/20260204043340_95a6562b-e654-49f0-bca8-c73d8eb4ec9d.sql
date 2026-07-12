-- Add phone_number column to tournament_participants table
ALTER TABLE public.tournament_participants 
ADD COLUMN IF NOT EXISTS phone_number text;