-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- System/admins can insert notifications for any user
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Also allow the join_tournament function to create notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Function to create notification for tournament participants
CREATE OR REPLACE FUNCTION public.notify_tournament_participants(
  p_tournament_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, tournament_id)
  SELECT 
    tp.user_id,
    p_type,
    p_title,
    p_message,
    p_tournament_id
  FROM public.tournament_participants tp
  WHERE tp.tournament_id = p_tournament_id;
END;
$$;

-- Trigger function to notify participants when room credentials are added
CREATE OR REPLACE FUNCTION public.notify_room_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if room_id was just added (was NULL, now has value)
  IF OLD.room_id IS NULL AND NEW.room_id IS NOT NULL THEN
    PERFORM public.notify_tournament_participants(
      NEW.id,
      'room_credentials',
      'Room Credentials Available!',
      'Room ID and password for "' || NEW.title || '" are now available. Check the tournament details.'
    );
  END IF;
  
  -- Notify on status changes
  IF OLD.status != NEW.status THEN
    IF NEW.status = 'live' THEN
      PERFORM public.notify_tournament_participants(
        NEW.id,
        'tournament_live',
        'Tournament Started!',
        '"' || NEW.title || '" is now LIVE! Join the match now.'
      );
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.notify_tournament_participants(
        NEW.id,
        'tournament_completed',
        'Tournament Completed',
        '"' || NEW.title || '" has ended. Check the results!'
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_tournament_participants(
        NEW.id,
        'tournament_cancelled',
        'Tournament Cancelled',
        '"' || NEW.title || '" has been cancelled. Entry fees will be refunded.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for tournament updates
CREATE TRIGGER on_tournament_update_notify
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_room_credentials();