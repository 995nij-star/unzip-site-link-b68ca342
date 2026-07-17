
-- Gaming clips table
CREATE TABLE public.gaming_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gaming_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clips" ON public.gaming_clips FOR SELECT USING (true);
CREATE POLICY "Users can upload their own clips" ON public.gaming_clips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clips" ON public.gaming_clips FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own clips" ON public.gaming_clips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all clips" ON public.gaming_clips FOR ALL TO authenticated USING (is_admin_or_moderator(auth.uid())) WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Clip likes
CREATE TABLE public.clip_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(clip_id, user_id)
);

ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clip likes" ON public.clip_likes FOR SELECT USING (true);
CREATE POLICY "Users can like clips" ON public.clip_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike clips" ON public.clip_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Clip comments
CREATE TABLE public.clip_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clip_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clip comments" ON public.clip_comments FOR SELECT USING (true);
CREATE POLICY "Users can add comments" ON public.clip_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.clip_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any comment" ON public.clip_comments FOR DELETE TO authenticated USING (is_admin_or_moderator(auth.uid()));

-- Storage bucket for gaming clips
INSERT INTO storage.buckets (id, name, public) VALUES ('gaming-clips', 'gaming-clips', true);

CREATE POLICY "Authenticated users can upload clips"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gaming-clips');

CREATE POLICY "Anyone can view clips storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'gaming-clips');

CREATE POLICY "Users can delete their own clips storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gaming-clips' AND (storage.foldername(name))[1] = auth.uid()::text);
