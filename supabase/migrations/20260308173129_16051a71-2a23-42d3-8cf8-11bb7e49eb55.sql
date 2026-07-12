
-- Allow admins to update gaming_clips (views, etc.)
CREATE POLICY "Admins can update any clip"
ON public.gaming_clips
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Allow admins to manage clip_likes (for editing like counts)
CREATE POLICY "Admins can insert clip likes"
ON public.clip_likes
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete clip likes"
ON public.clip_likes
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
