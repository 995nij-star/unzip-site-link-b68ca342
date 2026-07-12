
-- Update the safe view to include payment and security settings (needed by regular users)
CREATE OR REPLACE VIEW public.site_settings_public
WITH (security_invoker = on) AS
  SELECT id, key, value, updated_at
  FROM public.site_settings
  WHERE key IN ('theme', 'global_credentials', 'vapid_public_key', 'ai_settings', 'video', 
                'emergency_lock', 'enable_wallets', 'enable_tournaments', 'enable_chat', 
                'enable_clips', 'enable_streams', 'payment', 'security');
