import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AISettings {
  enabled: boolean;
  systemPrompt: string;
  mode: "auto" | "confirm";
}

const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  systemPrompt: "",
  mode: "auto",
};

export function useAISettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "ai_settings")
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_AI_SETTINGS;
      return { ...DEFAULT_AI_SETTINGS, ...((data as any)?.value as Record<string, unknown>) } as AISettings;
    },
  });

  const { mutate: updateAISettings, isPending: isUpdating } = useMutation({
    mutationFn: async (settings: Partial<AISettings>) => {
      const merged = { ...(data || DEFAULT_AI_SETTINGS), ...settings };
      // Check if row exists
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "ai_settings")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: merged as any, updated_at: new Date().toISOString() })
          .eq("key", "ai_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert([{ key: "ai_settings", value: merged as any }]);
        if (error) throw error;
      }
      return merged;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["ai-settings"], newData);
    },
  });

  return {
    aiSettings: data || DEFAULT_AI_SETTINGS,
    isLoading,
    updateAISettings,
    isUpdating,
  };
}
