-- Add image_url column to tournaments table for game logos
ALTER TABLE public.tournaments
ADD COLUMN image_url TEXT;