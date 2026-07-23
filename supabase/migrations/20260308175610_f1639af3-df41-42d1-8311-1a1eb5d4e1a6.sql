
CREATE TABLE public.website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (page_key, section_key)
);

ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read website content"
ON public.website_content FOR SELECT
USING (true);

CREATE POLICY "Admins can manage website content"
ON public.website_content FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.website_content (page_key, section_key, content) VALUES
('homepage', 'hero', '{"title": "XT ESP - Ultimate Gaming Hub", "subtitle": "Join tournaments, win prizes, and connect with gamers", "cta_text": "Get Started"}'::jsonb),
('homepage', 'features', '{"heading": "Why Choose Us", "items": ["Live Tournaments", "Instant Payouts", "24/7 Support", "Screen Recording"]}'::jsonb),
('dashboard', 'welcome', '{"title": "Welcome Back, Gamer!", "subtitle": "Check out the latest tournaments and clips"}'::jsonb),
('login', 'page', '{"title": "Welcome Back", "subtitle": "Sign in to your account", "cta_text": "Sign In"}'::jsonb),
('signup', 'page', '{"title": "Join the Arena", "subtitle": "Create your gaming account", "cta_text": "Create Account"}'::jsonb),
('tournaments', 'header', '{"title": "Tournaments", "subtitle": "Compete and win real prizes"}'::jsonb),
('clips', 'header', '{"title": "Gaming Clips", "subtitle": "Watch and share epic moments"}'::jsonb),
('streams', 'header', '{"title": "Live Streams", "subtitle": "Watch gamers play live"}'::jsonb),
('wallet', 'header', '{"title": "Your Wallet", "subtitle": "Manage your funds"}'::jsonb),
('help', 'header', '{"title": "Help Center", "subtitle": "We are here to help you"}'::jsonb);
