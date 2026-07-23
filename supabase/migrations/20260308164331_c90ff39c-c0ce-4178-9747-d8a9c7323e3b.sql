
-- Fraud alerts table for persisting detected fraud patterns
CREATE TABLE public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'multi_account_device', 'multi_account_ip', 'duplicate_tournament_entry', 'suspicious_login', 'rapid_account_creation', 'suspicious_wallet', 'brute_force'
  risk_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_user_ids TEXT[] DEFAULT '{}',
  device_id TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'reviewing', 'resolved', 'dismissed'
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write fraud alerts
CREATE POLICY "Admins can manage fraud alerts"
ON public.fraud_alerts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Enable realtime for fraud alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_alerts;

-- Index for quick lookups
CREATE INDEX idx_fraud_alerts_status ON public.fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_risk ON public.fraud_alerts(risk_level);
CREATE INDEX idx_fraud_alerts_created ON public.fraud_alerts(created_at DESC);
