
-- Trigger function to notify followers when a new clip is uploaded
CREATE OR REPLACE FUNCTION public.notify_followers_new_clip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
BEGIN
  -- Get uploader's username
  SELECT username INTO v_username FROM public.profiles WHERE user_id = NEW.user_id;

  -- Insert notification for each follower
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT
    uf.follower_id,
    'new_clip',
    'New Clip from ' || COALESCE(v_username, 'a creator'),
    COALESCE(v_username, 'A creator') || ' uploaded "' || LEFT(NEW.title, 80) || '"'
  FROM public.user_follows uf
  WHERE uf.following_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER on_new_clip_notify_followers
  AFTER INSERT ON public.gaming_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_clip();
