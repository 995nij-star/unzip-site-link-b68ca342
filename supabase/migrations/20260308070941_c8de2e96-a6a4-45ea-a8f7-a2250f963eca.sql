
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Direct messages
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is participant of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- RLS for conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (is_conversation_participant(auth.uid(), id));

CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Participants can update conversation" ON public.conversations
  FOR UPDATE TO authenticated
  USING (is_conversation_participant(auth.uid(), id));

-- RLS for conversation_participants
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Authenticated users can add participants" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS for direct_messages
CREATE POLICY "Users can view messages in their conversations" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can send messages to their conversations" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can update their own messages" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (is_conversation_participant(auth.uid(), conversation_id));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
