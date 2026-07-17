
-- Bot checks audit table
CREATE TABLE public.bot_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('human', 'bot', 'inconclusive')),
  confidence integer NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  signal_score integer NOT NULL DEFAULT 0,
  ai_verdict text,
  ai_reasoning text,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  captcha_challenge_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot checks" ON public.bot_checks
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_bot_checks_target ON public.bot_checks(target_user_id, created_at DESC);

-- CAPTCHA challenges
CREATE TABLE public.captcha_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  question text NOT NULL,
  expected_answer text NOT NULL,
  user_answer text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','expired')),
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.captcha_challenges ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins can manage captcha challenges" ON public.captcha_challenges
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Target user can view their own pending challenge (without seeing expected_answer via app code)
CREATE POLICY "Target user can view own challenge" ON public.captcha_challenges
  FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id);

CREATE INDEX idx_captcha_target ON public.captcha_challenges(target_user_id, status, expires_at);

-- RPC for the target user to submit an answer (so they can't read expected_answer column directly via RLS)
CREATE OR REPLACE FUNCTION public.submit_captcha_answer(p_challenge_id uuid, p_answer text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ch captcha_challenges%ROWTYPE;
  v_passed boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_ch FROM public.captcha_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_ch IS NULL OR v_ch.target_user_id <> v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_ch.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Challenge already ' || v_ch.status);
  END IF;

  IF v_ch.expires_at < now() THEN
    UPDATE public.captcha_challenges SET status = 'expired' WHERE id = p_challenge_id;
    RETURN json_build_object('success', false, 'error', 'Challenge expired');
  END IF;

  v_passed := lower(trim(coalesce(p_answer, ''))) = lower(trim(v_ch.expected_answer));

  UPDATE public.captcha_challenges
    SET attempts = attempts + 1,
        user_answer = p_answer,
        status = CASE WHEN v_passed THEN 'passed'
                      WHEN attempts + 1 >= 3 THEN 'failed'
                      ELSE 'pending' END,
        answered_at = CASE WHEN v_passed OR attempts + 1 >= 3 THEN now() ELSE answered_at END
    WHERE id = p_challenge_id;

  RETURN json_build_object(
    'success', true,
    'passed', v_passed,
    'attempts_remaining', GREATEST(0, 3 - (v_ch.attempts + 1)),
    'status', CASE WHEN v_passed THEN 'passed'
                   WHEN v_ch.attempts + 1 >= 3 THEN 'failed'
                   ELSE 'pending' END
  );
END;
$$;
