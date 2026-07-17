
-- Live streams table
CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  stream_url text NOT NULL,
  platform text NOT NULL DEFAULT 'youtube',
  thumbnail_url text,
  is_live boolean NOT NULL DEFAULT true,
  viewer_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live streams" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create streams" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streams" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own streams" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all streams" ON public.live_streams FOR ALL TO authenticated USING (is_admin_or_moderator(auth.uid())) WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Stream chat messages
CREATE TABLE public.stream_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stream messages" ON public.stream_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.stream_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.stream_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any message" ON public.stream_messages FOR DELETE TO authenticated USING (is_admin_or_moderator(auth.uid()));

-- Stream reactions
CREATE TABLE public.stream_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '🔥',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.stream_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON public.stream_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.stream_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for chat and reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_reactions;
