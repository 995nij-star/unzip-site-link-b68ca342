import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: string;
  action: string;
  target_id: string | null;
  created_at: string;
  details: any;
}

export function RecentActivityLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, action, target_id, created_at, details")
        .in("target_type", ["system"])
        .order("created_at", { ascending: false })
        .limit(10);
      setEntries((data as AuditEntry[]) || []);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes("emergency_lock_activated")) return "destructive";
    if (action.includes("emergency_lock_deactivated")) return "default";
    if (action.includes("disable")) return "destructive";
    return "default";
  };

  const getActionLabel = (action: string, targetId: string | null) => {
    if (action === "emergency_lock_activated") return "Emergency Lock ON";
    if (action === "emergency_lock_deactivated") return "Emergency Lock OFF";
    if (action === "enable_system") return `Enabled ${targetId?.replace(/_/g, " ") || "system"}`;
    if (action === "disable_system") return `Disabled ${targetId?.replace(/_/g, " ") || "system"}`;
    return action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground font-rajdhani py-4 text-center">
        No recent system activity.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <Badge variant={getActionColor(entry.action) as any} className="font-rajdhani text-xs">
              {getActionLabel(entry.action, entry.target_id)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground font-rajdhani">
            {format(new Date(entry.created_at), "MMM d, h:mm a")}
          </span>
        </div>
      ))}
    </div>
  );
}
