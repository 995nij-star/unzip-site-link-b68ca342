-- 1) Scope all helper-using policies currently on PUBLIC to authenticated only
ALTER POLICY "Admins can manage account locks" ON public.account_locks TO authenticated;
ALTER POLICY "Moderators can view account locks" ON public.account_locks TO authenticated;
ALTER POLICY "Admins can insert audit log" ON public.admin_audit_log TO authenticated;
ALTER POLICY "Admins can view audit log" ON public.admin_audit_log TO authenticated;
ALTER POLICY "Admins can create announcements" ON public.announcements TO authenticated;
ALTER POLICY "Admins can delete announcements" ON public.announcements TO authenticated;
ALTER POLICY "Admins can update announcements" ON public.announcements TO authenticated;
ALTER POLICY "Admins can view all announcements" ON public.announcements TO authenticated;
ALTER POLICY "Admins can manage APK releases" ON public.apk_releases TO authenticated;
ALTER POLICY "Admins can manage automation rules" ON public.automation_rules TO authenticated;
ALTER POLICY "Admins can delete applications" ON public.mod_applications TO authenticated;
ALTER POLICY "Admins can update applications" ON public.mod_applications TO authenticated;
ALTER POLICY "Admins can view all applications" ON public.mod_applications TO authenticated;
ALTER POLICY "Admins can view all subscriptions" ON public.push_subscriptions TO authenticated;
ALTER POLICY "Admins can view all redeem attempts" ON public.redeem_attempts TO authenticated;
ALTER POLICY "Admins can insert site settings" ON public.site_settings TO authenticated;
ALTER POLICY "Admins can update site settings" ON public.site_settings TO authenticated;
ALTER POLICY "Only admins can read site settings" ON public.site_settings TO authenticated;
ALTER POLICY "Admins can delete tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Admins can update tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Admins can view all tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Admins can manage suspicious activities" ON public.suspicious_activities TO authenticated;
ALTER POLICY "Admins can update topup requests" ON public.topup_requests TO authenticated;
ALTER POLICY "Admins can view all topup requests" ON public.topup_requests TO authenticated;
ALTER POLICY "Admins can update tournament participants" ON public.tournament_participants TO authenticated;
ALTER POLICY "Admins can view all participants" ON public.tournament_participants TO authenticated;
ALTER POLICY "Admins can delete reports" ON public.user_reports TO authenticated;
ALTER POLICY "Admins can update reports" ON public.user_reports TO authenticated;
ALTER POLICY "Admins can view all reports" ON public.user_reports TO authenticated;
ALTER POLICY "Admins can manage website content" ON public.website_content TO authenticated;
ALTER POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests TO authenticated;
ALTER POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests TO authenticated;

-- 2) Revoke EXECUTE from anon (and PUBLIC) on RLS helper SECURITY DEFINER functions.
--    Grant only to authenticated and service_role so policies on authenticated-only
--    tables continue to evaluate normally.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;