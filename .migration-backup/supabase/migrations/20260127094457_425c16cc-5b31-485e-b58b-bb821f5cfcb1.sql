-- Function to notify all users about new announcements
CREATE OR REPLACE FUNCTION public.notify_all_users_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify if announcement is being published (was not published before, now is published)
  IF (OLD IS NULL OR OLD.is_published = false) AND NEW.is_published = true THEN
    INSERT INTO public.notifications (user_id, type, title, message, tournament_id)
    SELECT 
      p.user_id,
      'announcement',
      NEW.title,
      LEFT(NEW.content, 200),
      NEW.tournament_id
    FROM public.profiles p
    WHERE p.user_id != NEW.created_by; -- Don't notify the admin who created it
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for new announcements
CREATE TRIGGER on_announcement_published
AFTER INSERT OR UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_announcement();

-- Function to notify user when admin responds to their support ticket
CREATE OR REPLACE FUNCTION public.notify_ticket_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify if admin_notes was added/changed and user_id exists
  IF NEW.user_id IS NOT NULL AND 
     (OLD.admin_notes IS NULL OR OLD.admin_notes != NEW.admin_notes) AND 
     NEW.admin_notes IS NOT NULL AND 
     NEW.admin_notes != '' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'ticket_response',
      'Support Ticket Update',
      'Your support request has received a response. Check Help Center for details.'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for ticket responses
CREATE TRIGGER on_ticket_response
AFTER UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_response();