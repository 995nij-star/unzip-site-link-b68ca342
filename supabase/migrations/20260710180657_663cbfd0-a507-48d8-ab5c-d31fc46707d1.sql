-- Migration: 20260124183321_d9685bac-4a26-4481-8187-6602a02f9039.sql
-- Fix the overly permissive tournament update policy
DROP POLICY IF EXISTS "Tournament update policy" ON public.tournaments;

-- Only allow updates via the security definer function (no direct updates)
CREATE POLICY "No direct tournament updates"
  ON public.tournaments FOR UPDATE
  USING (false);

-- Migration: 20260125091305_1a6baa3b-3983-4ecd-b911-6b966e2c9f61.sql
-- Create a view to aggregate player leaderboard stats
-- This combines profile data with tournament participation and wallet transactions

CREATE OR REPLACE VIEW public.player_leaderboard AS
SELECT 
  p.user_id,
  p.username,
  p.avatar_url,
  COALESCE(tp.tournaments_played, 0) as tournaments_played,
  COALESCE(wins.total_wins, 0) as wins,
  COALESCE(earnings.total_earnings, 0) as total_earnings
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as tournaments_played
  FROM public.tournament_participants
  GROUP BY user_id
) tp ON p.user_id = tp.user_id
LEFT JOIN (
  -- Count wins from prize transactions (positive amounts with type 'prize')
  SELECT user_id, COUNT(*) as total_wins
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) wins ON p.user_id = wins.user_id
LEFT JOIN (
  -- Sum all prize earnings
  SELECT user_id, SUM(amount) as total_earnings
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) earnings ON p.user_id = earnings.user_id
ORDER BY total_earnings DESC, wins DESC, tournaments_played DESC;

-- Migration: 20260125091351_eb508908-a5db-426c-abcb-1fd0e741b0d6.sql
-- Drop and recreate the view with security_invoker to fix the security issue
DROP VIEW IF EXISTS public.player_leaderboard; -- @allow-destructive (historical view recreation)

CREATE VIEW public.player_leaderboard
WITH (security_invoker = on) AS
SELECT 
  p.user_id,
  p.username,
  p.avatar_url,
  COALESCE(tp.tournaments_played, 0) as tournaments_played,
  COALESCE(wins.total_wins, 0) as wins,
  COALESCE(earnings.total_earnings, 0) as total_earnings
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as tournaments_played
  FROM public.tournament_participants
  GROUP BY user_id
) tp ON p.user_id = tp.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as total_wins
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) wins ON p.user_id = wins.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_earnings
  FROM public.wallet_transactions
  WHERE type = 'prize' AND amount > 0
  GROUP BY user_id
) earnings ON p.user_id = earnings.user_id
ORDER BY total_earnings DESC, wins DESC, tournaments_played DESC;

-- Migration: 20260126060759_27834689-449d-4b46-aa76-b0f2034c6df6.sql
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for user_roles
-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Add is_banned column to profiles for user management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Update tournament policies to allow admin updates
DROP POLICY IF EXISTS "No direct tournament updates" ON public.tournaments;

CREATE POLICY "Admins can update tournaments"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournaments"
ON public.tournaments
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to update all wallets
CREATE POLICY "Admins can update all wallets"
ON public.wallets
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to insert transactions (for manual adjustments)
CREATE POLICY "Admins can insert transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Migration: 20260126152337_3d099022-7c1f-44f9-bd61-daff57a6d6d6.sql
-- Create table for storing login OTPs
CREATE TABLE public.login_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_login_otps_email ON public.login_otps(email);
CREATE INDEX idx_login_otps_expires ON public.login_otps(expires_at);

-- Enable RLS
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role can access
-- This is intentional for security