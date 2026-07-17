
-- Allow admins/moderators to view all direct messages
CREATE POLICY "Admins can view all messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- Allow admins/moderators to view all conversation participants
CREATE POLICY "Admins can view all participants" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- Allow admins/moderators to view all conversations
CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (is_admin_or_moderator(auth.uid()));
