import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AIChatWidget = lazy(() => import("@/components/AIChatWidget"));

/**
 * Renders the xt Support AI widget only when admins have enabled it
 * via site_settings (`ai_chat_widget_enabled`). Defaults to disabled
 * so the widget stays hidden until an admin explicitly turns it on.
 */
export default function AIChatWidgetGate() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const read = (value: unknown): boolean => {
      if (value === true) return true;
      if (value && typeof value === "object" && "enabled" in (value as any)) {
        return (value as any).enabled === true;
      }
      return false;
    };

    const fetchSetting = async () => {
      const { data } = await supabase
        .from("site_settings_public")
        .select("value")
        .eq("key", "ai_chat_widget_enabled")
        .maybeSingle();
      if (!cancelled) setEnabled(read(data?.value));
    };

    fetchSetting();

    const channel = supabase
      .channel("ai-chat-widget-toggle")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.ai_chat_widget_enabled" },
        (payload: any) => {
          if (!cancelled) setEnabled(read(payload.new?.value));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <AIChatWidget />
    </Suspense>
  );
}