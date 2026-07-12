-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  upi_id VARCHAR(100) NOT NULL,
  account_holder_name VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();