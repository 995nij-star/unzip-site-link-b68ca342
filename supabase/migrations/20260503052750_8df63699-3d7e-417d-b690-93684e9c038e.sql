
-- 1. Tighten direct_messages UPDATE: only sender can update their own messages
DROP POLICY IF EXISTS "Users can update their own messages" ON public.direct_messages;
CREATE POLICY "Users can update their own messages"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id AND public.is_conversation_participant(auth.uid(), conversation_id))
  WITH CHECK (auth.uid() = sender_id);

-- 2. Convert profiles_public view to security_invoker so it respects caller's RLS
ALTER VIEW public.profiles_public SET (security_invoker = on);
