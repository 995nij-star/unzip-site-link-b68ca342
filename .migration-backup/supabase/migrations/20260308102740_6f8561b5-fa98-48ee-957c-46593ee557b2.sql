
-- Create a function to start a conversation and add both participants
CREATE OR REPLACE FUNCTION public.start_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_conv_id uuid;
  v_existing_conv_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot start conversation with yourself';
  END IF;

  -- Check if conversation already exists between these two users
  SELECT cp1.conversation_id INTO v_existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = v_user_id AND cp2.user_id = p_other_user_id
  LIMIT 1;

  IF v_existing_conv_id IS NOT NULL THEN
    RETURN v_existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO v_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id), (v_conv_id, p_other_user_id);

  RETURN v_conv_id;
END;
$$;
