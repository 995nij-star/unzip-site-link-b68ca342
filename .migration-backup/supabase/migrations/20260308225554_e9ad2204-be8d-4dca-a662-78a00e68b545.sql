
-- Fix: Make profiles_public use security_invoker instead of security_definer
ALTER VIEW public.profiles_public SET (security_invoker = true);
