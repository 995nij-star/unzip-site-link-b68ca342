import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';

export interface BanAuditLogEntry {
  id: string;
  user_id: string;
  admin_id: string;
  action: 'ban' | 'unban';
  reason: string | null;
  created_at: string;
  // Joined fields
  username?: string;
  admin_username?: string;
}

interface BanAuditLogFilters {
  userId?: string;
  adminId?: string;
  action?: 'ban' | 'unban' | 'all';
  startDate?: Date;
  endDate?: Date;
}

export function useBanAuditLog(filters?: BanAuditLogFilters) {
  const { hasAdminAccess } = useAdmin();

  return useQuery({
    queryKey: ['banAuditLog', filters],
    queryFn: async () => {
      // Fetch audit logs
      let query = supabase
        .from('ban_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.adminId) {
        query = query.eq('admin_id', filters.adminId);
      }
      if (filters?.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data: logs, error: logsError } = await query;
      if (logsError) throw logsError;

      // Fetch profiles for usernames
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      // Map usernames to logs
      const logsWithUsernames = (logs ?? []).map((log) => {
        const userProfile = profiles?.find((p) => p.user_id === log.user_id);
        const adminProfile = profiles?.find((p) => p.user_id === log.admin_id);
        return {
          ...log,
          username: userProfile?.username ?? 'Unknown',
          admin_username: adminProfile?.username ?? 'Unknown',
        } as BanAuditLogEntry;
      });

      return logsWithUsernames;
    },
    enabled: hasAdminAccess,
  });
}

export function exportBanAuditLogToCSV(logs: BanAuditLogEntry[]): string {
  const headers = ['Date', 'Action', 'User', 'Admin', 'Reason'];
  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.action.toUpperCase(),
    log.username ?? log.user_id,
    log.admin_username ?? log.admin_id,
    log.reason ?? '-',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}
