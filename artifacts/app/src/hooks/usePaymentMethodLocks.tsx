import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethodLock {
  method_id: string;
  label: string;
  enabled: boolean;
  updated_at: string;
}

/**
 * Real-time subscription to payment_method_locks.
 * Any admin toggle propagates to every connected client instantly.
 */
export function usePaymentMethodLocks() {
  const [locks, setLocks] = useState<Record<string, PaymentMethodLock>>({});
  const [loading, setLoading] = useState(true);

  const fetchLocks = useCallback(async () => {
    // Cast: table is created outside the generated types.ts.
    const { data, error } = await (supabase as any)
      .from("payment_method_locks")
      .select("method_id, label, enabled, updated_at");
    if (!error && data) {
      const map: Record<string, PaymentMethodLock> = {};
      for (const row of data as PaymentMethodLock[]) map[row.method_id] = row;
      setLocks(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocks();

    const channel = supabase
      .channel("payment_method_locks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_method_locks" },
        (payload) => {
          setLocks((prev) => {
            const next = { ...prev };
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as PaymentMethodLock;
              delete next[oldRow.method_id];
            } else {
              const row = payload.new as PaymentMethodLock;
              next[row.method_id] = row;
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLocks]);

  const isEnabled = useCallback(
    (methodId: string) => locks[methodId]?.enabled ?? true,
    [locks]
  );

  return { locks, loading, isEnabled, refetch: fetchLocks };
}
