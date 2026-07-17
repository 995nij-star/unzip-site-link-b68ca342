
-- Add short_code column to gaming_clips
ALTER TABLE public.gaming_clips ADD COLUMN short_code text UNIQUE;

-- Create function to generate unique short codes
CREATE OR REPLACE FUNCTION public.generate_clip_short_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.gaming_clips WHERE short_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.short_code := new_code;
  RETURN NEW;
END;
$$;

-- Auto-assign short codes on insert
CREATE TRIGGER assign_clip_short_code
  BEFORE INSERT ON public.gaming_clips
  FOR EACH ROW
  WHEN (NEW.short_code IS NULL)
  EXECUTE FUNCTION public.generate_clip_short_code();

-- Backfill existing clips with short codes
DO $$
DECLARE
  rec RECORD;
  new_code text;
  code_exists boolean;
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  FOR rec IN SELECT id FROM public.gaming_clips WHERE short_code IS NULL LOOP
    LOOP
      new_code := '';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      SELECT EXISTS(SELECT 1 FROM public.gaming_clips WHERE short_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE public.gaming_clips SET short_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Create clip_reports table
CREATE TABLE public.clip_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.gaming_clips(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  UNIQUE(clip_id, reporter_id)
);

ALTER TABLE public.clip_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report clips" ON public.clip_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.clip_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage clip reports" ON public.clip_reports
  FOR ALL TO authenticated
  USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));
