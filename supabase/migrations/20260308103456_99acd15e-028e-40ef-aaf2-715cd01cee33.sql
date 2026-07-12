
-- Trigger: notify on new follower
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_username text;
BEGIN
  SELECT username INTO v_username FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.following_id, 'new_follower', 'New Follower!', COALESCE(v_username, 'Someone') || ' started following you.');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_follower ON public.user_follows;
CREATE TRIGGER on_new_follower AFTER INSERT ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();

-- Trigger: notify on profile like
CREATE OR REPLACE FUNCTION public.notify_profile_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_username text;
BEGIN
  IF NEW.user_id = NEW.profile_user_id THEN RETURN NEW; END IF;
  SELECT username INTO v_username FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.profile_user_id, 'profile_like', 'Profile Liked!', COALESCE(v_username, 'Someone') || ' liked your profile.');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_like ON public.profile_likes;
CREATE TRIGGER on_profile_like AFTER INSERT ON public.profile_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_profile_like();

-- Trigger: notify on wallet topup approved
CREATE OR REPLACE FUNCTION public.notify_topup_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'wallet_topup', 'Top-up Approved!', '₹' || NEW.amount || ' has been added to your wallet.');
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'wallet_rejected', 'Top-up Rejected', 'Your ₹' || NEW.amount || ' top-up request was rejected.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_topup_status ON public.topup_requests;
CREATE TRIGGER on_topup_status AFTER UPDATE ON public.topup_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_topup_status();

-- Trigger: notify on withdrawal status
CREATE OR REPLACE FUNCTION public.notify_withdrawal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'withdrawal_approved', 'Withdrawal Approved!', '₹' || NEW.amount || ' withdrawal has been processed.');
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'withdrawal_rejected', 'Withdrawal Rejected', 'Your ₹' || NEW.amount || ' withdrawal was rejected.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER on_withdrawal_status AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();

-- Trigger: notify on new direct message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_username text;
  v_recipient_id uuid;
BEGIN
  SELECT username INTO v_username FROM public.profiles WHERE user_id = NEW.sender_id;
  -- Notify all other participants
  FOR v_recipient_id IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (v_recipient_id, 'new_message', 'New Message', COALESCE(v_username, 'Someone') || ': ' || LEFT(NEW.content, 100));
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON public.direct_messages;
CREATE TRIGGER on_new_message AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
