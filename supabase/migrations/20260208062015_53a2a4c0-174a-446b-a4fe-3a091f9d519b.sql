-- Enable realtime for profiles table so admin can see live user status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for user_roles table so admin can see role changes in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;