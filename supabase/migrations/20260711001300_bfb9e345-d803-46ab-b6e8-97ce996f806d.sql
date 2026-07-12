-- Expose login_page settings to the public view so the unauthenticated login page can read customization
CREATE OR REPLACE VIEW public.site_settings_public
WITH (security_invoker = on) AS
  SELECT id, key, value, updated_at
  FROM public.site_settings
  WHERE key IN ('theme', 'global_credentials', 'vapid_public_key', 'ai_settings', 'video',
                'emergency_lock', 'enable_wallets', 'enable_tournaments', 'enable_chat',
                'enable_clips', 'enable_streams', 'payment', 'security', 'login_page');

-- Seed default login_page settings if missing
INSERT INTO public.site_settings (key, value)
SELECT 'login_page', '{
  "welcomeTitle": "Welcome Back",
  "welcomeSubtitle": "Sign in to continue your journey",
  "heroKicker": "WELCOME BACK,",
  "heroTitle": "CHAMPIONS NEVER STOP!",
  "heroSubtitle": "Sign in to continue your journey and unlock the next level of greatness.",
  "footerText": "© 2026 IDEXOPN. All rights reserved.",
  "logoUrl": null,
  "backgroundImageUrl": null,
  "primaryColor": "270 100% 65%",
  "accentColor": "210 100% 60%",
  "buttonGradientFrom": "270 100% 65%",
  "buttonGradientTo": "210 100% 60%",
  "glassOpacity": 0.55,
  "glassBlur": 24,
  "borderGlow": 0.6,
  "showGoogleLogin": true,
  "showEmailLogin": true,
  "showRegister": true,
  "showForgotPassword": true,
  "showRememberMe": true,
  "showDarkModeToggle": true,
  "showLanguageSelector": true
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'login_page');