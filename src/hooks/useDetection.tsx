import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface DetectionEvent {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  details: Record<string, any>;
  affected_user_id: string | null;
  affected_resource_type: string | null;
  affected_resource_id: string | null;
  auto_action_taken: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolver_notes: string | null;
  source: string;
  rule_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useDetection() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["detection-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detection_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as DetectionEvent[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("detection-events-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "detection_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["detection-events"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const runScan = useMutation({
    mutationFn: async (scanType: string = "full") => {
      const { data, error } = await supabase.functions.invoke("arjun-era-detect", {
        body: { scan_type: scanType },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["detection-events"] });
      toast({
        title: "Scan Complete",
        description: `Found ${data.summary?.total_events || 0} issues. ${data.summary?.auto_actions_applied || 0} auto-actions applied.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    },
  });

  const resolveEvent = useMutation({
    mutationFn: async ({ eventId, status, notes }: { eventId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("detection_events" as any)
        .update({
          status,
          resolver_notes: notes || null,
          resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
        })
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detection-events"] });
      toast({ title: "Event updated" });
    },
  });

  const stats = {
    total: events.length,
    open: events.filter((e) => e.status === "open").length,
    critical: events.filter((e) => e.severity === "critical" && e.status === "open").length,
    high: events.filter((e) => e.severity === "high" && e.status === "open").length,
    byCategory: {
      security: events.filter((e) => e.category === "security" && e.status === "open").length,
      fraud: events.filter((e) => e.category === "fraud" && e.status === "open").length,
      content: events.filter((e) => e.category === "content" && e.status === "open").length,
      health: events.filter((e) => e.category === "health" && e.status === "open").length,
    },
  };

  return { events, isLoading, stats, runScan, resolveEvent };
}
