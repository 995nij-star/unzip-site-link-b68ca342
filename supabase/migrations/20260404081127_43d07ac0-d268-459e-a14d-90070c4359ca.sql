
-- Detection events table - unified log for all detected threats
CREATE TABLE public.detection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- security, fraud, content, health
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title text NOT NULL,
  description text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  affected_user_id uuid NULL,
  affected_resource_type text NULL, -- clip, message, tournament, etc.
  affected_resource_id text NULL,
  auto_action_taken text NULL, -- ban, warn, flag, block, none
  status text NOT NULL DEFAULT 'open', -- open, investigating, resolved, dismissed
  resolved_by uuid NULL,
  resolved_at timestamptz NULL,
  resolver_notes text NULL,
  source text NOT NULL DEFAULT 'system', -- system, ai, manual, rule
  rule_id uuid NULL REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.detection_events ENABLE ROW LEVEL SECURITY;

-- Only admins/moderators can access
CREATE POLICY "Admins can manage detection events"
  ON public.detection_events FOR ALL TO authenticated
  USING (is_admin_or_moderator(auth.uid()))
  WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Index for performance
CREATE INDEX idx_detection_events_category ON public.detection_events(category);
CREATE INDEX idx_detection_events_status ON public.detection_events(status);
CREATE INDEX idx_detection_events_severity ON public.detection_events(severity);
CREATE INDEX idx_detection_events_created_at ON public.detection_events(created_at DESC);

-- Timestamp trigger
CREATE TRIGGER update_detection_events_updated_at
  BEFORE UPDATE ON public.detection_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.detection_events;
