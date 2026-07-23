-- Create a function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Allow moderators to view all profiles (already allowed via public SELECT)
-- Allow moderators to update profiles (for banning)
CREATE POLICY "Moderators can update profiles for banning"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all wallets
CREATE POLICY "Moderators can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to update wallets
CREATE POLICY "Moderators can update all wallets"
ON public.wallets
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all transactions
CREATE POLICY "Moderators can view all transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to insert transactions
CREATE POLICY "Moderators can insert transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all topup requests
CREATE POLICY "Moderators can view all topup requests"
ON public.topup_requests
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to update topup requests
CREATE POLICY "Moderators can update topup requests"
ON public.topup_requests
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all withdrawal requests
CREATE POLICY "Moderators can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to update withdrawal requests
CREATE POLICY "Moderators can update withdrawal requests"
ON public.withdrawal_requests
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all support tickets
CREATE POLICY "Moderators can view all tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to update support tickets
CREATE POLICY "Moderators can update tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all tournaments (already public)
-- Allow moderators to update tournaments
CREATE POLICY "Moderators can update tournaments"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to create tournaments
CREATE POLICY "Moderators can create tournaments"
ON public.tournaments
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Allow moderators to insert ban audit logs
CREATE POLICY "Moderators can insert ban audit logs"
ON public.ban_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view ban audit logs
CREATE POLICY "Moderators can view ban audit logs"
ON public.ban_audit_log
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view all announcements
CREATE POLICY "Moderators can view all announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to create announcements
CREATE POLICY "Moderators can create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Allow moderators to update announcements
CREATE POLICY "Moderators can update announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view notifications (for inserting)
CREATE POLICY "Moderators can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view tournament participants
-- (already public SELECT)
-- Allow moderators to update tournament participants
CREATE POLICY "Moderators can update tournament participants"
ON public.tournament_participants
FOR UPDATE
TO authenticated
USING (is_admin_or_moderator(auth.uid()));

-- Allow moderators to view user roles
CREATE POLICY "Moderators can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_admin_or_moderator(auth.uid()));