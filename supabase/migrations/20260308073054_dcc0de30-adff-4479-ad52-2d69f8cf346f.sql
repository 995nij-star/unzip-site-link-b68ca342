-- Store AI chat messages per user
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own AI chats"
  ON public.ai_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own AI chats"
  ON public.ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages (clear chat)
CREATE POLICY "Users can delete own AI chats"
  ON public.ai_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all AI chats
CREATE POLICY "Admins can view all AI chats"
  ON public.ai_chat_messages FOR SELECT TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- Admins can delete any AI chat message
CREATE POLICY "Admins can delete any AI chat"
  ON public.ai_chat_messages FOR DELETE TO authenticated
  USING (is_admin_or_moderator(auth.uid()));