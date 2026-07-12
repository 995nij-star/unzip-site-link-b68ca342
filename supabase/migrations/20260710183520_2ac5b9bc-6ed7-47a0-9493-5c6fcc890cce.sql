-- Trigger to auto-grant super_admin + admin role for the permanent owner email
CREATE OR REPLACE FUNCTION public.grant_super_admin_if_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'okbin8511@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_if_owner();

-- Backfill for existing user (if already signed up)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE lower(email) = 'okbin8511@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'okbin8511@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
