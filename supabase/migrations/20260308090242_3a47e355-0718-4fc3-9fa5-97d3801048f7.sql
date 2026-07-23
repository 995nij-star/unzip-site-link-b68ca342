
-- Push notification subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role / edge functions need to read all subscriptions to send notifications
CREATE POLICY "Admins can view all subscriptions" ON public.push_subscriptions
  FOR SELECT USING (is_admin(auth.uid()));
