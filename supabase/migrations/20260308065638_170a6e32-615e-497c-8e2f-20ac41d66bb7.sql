ALTER TABLE public.profiles 
  ADD COLUMN full_name text DEFAULT NULL,
  ADD COLUMN age integer DEFAULT NULL,
  ADD COLUMN phone text DEFAULT NULL,
  ADD COLUMN city text DEFAULT NULL;