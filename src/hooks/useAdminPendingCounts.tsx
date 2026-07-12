import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

export interface AdminPendingCounts {
  pendingTopups: number;
  pendingWithdrawals: number;
  openTickets: number;
  pendingModApps: number;
  openDetections: number;
  suspiciousActivities: number;
}

export function useAdminPendingCounts() {
  const { hasAdminAccess } = useAdmin();

  return useQuery({
    queryKey: ["adminPendingCounts"],
    queryFn: async (): Promise<AdminPendingCounts> => {
      const [topups, withdrawals, tickets, modApps, detections, suspicious] = await Promise.all([
        supabase.from("topup_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("mod_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("detection_events").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("suspicious_activities").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        pendingTopups: topups.count ?? 0,
        pendingWithdrawals: withdrawals.count ?? 0,
        openTickets: tickets.count ?? 0,
        pendingModApps: modApps.count ?? 0,
        openDetections: detections.count ?? 0,
        suspiciousActivities: suspicious.count ?? 0,
      };
    },
    enabled: hasAdminAccess,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
