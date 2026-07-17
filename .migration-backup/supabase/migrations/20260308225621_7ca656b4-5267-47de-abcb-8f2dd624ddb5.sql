
-- Revert security_invoker - profiles_public MUST be security_definer 
-- to allow cross-user lookups while masking PII columns
ALTER VIEW public.profiles_public SET (security_invoker = false);

-- Grant SELECT on the view to authenticated and anon
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
