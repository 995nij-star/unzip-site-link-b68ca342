-- Restrict Realtime channel subscriptions to authenticated users
-- and scope private user channels by user id in the topic name.

-- Ensure RLS is enabled on realtime.messages
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if they exist (idempotent)
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;

-- Allow authenticated users to receive messages only on:
--  * public topics that don't begin with "user:" or "private:"
--  * private topics that include their own auth.uid()
CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() NOT LIKE 'user:%'
    AND realtime.topic() NOT LIKE 'private:%'
  )
  OR realtime.topic() = 'user:' || auth.uid()::text
  OR realtime.topic() = 'private:' || auth.uid()::text
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
  OR realtime.topic() LIKE 'private:' || auth.uid()::text || ':%'
);

-- Allow authenticated users to broadcast/presence-write only on their own scoped topics
-- or on shared (non user-scoped) topics
CREATE POLICY "Authenticated can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() NOT LIKE 'user:%'
    AND realtime.topic() NOT LIKE 'private:%'
  )
  OR realtime.topic() = 'user:' || auth.uid()::text
  OR realtime.topic() = 'private:' || auth.uid()::text
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
  OR realtime.topic() LIKE 'private:' || auth.uid()::text || ':%'
);