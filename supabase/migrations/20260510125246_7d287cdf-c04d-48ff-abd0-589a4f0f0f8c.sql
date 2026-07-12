DO $$
BEGIN
  BEGIN
    ALTER TABLE public.captcha_challenges REPLICA IDENTITY FULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.bot_checks REPLICA IDENTITY FULL;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.captcha_challenges;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_checks;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;