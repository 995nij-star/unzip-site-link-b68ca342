-- Allow admins to update any profile (e.g., for banning users)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));