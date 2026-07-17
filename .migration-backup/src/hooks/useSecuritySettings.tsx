import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SecuritySettings {
  twoFactorEnabled: boolean;
}

const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
};

export function useSecuritySettings() {
  const queryClient = useQueryClient();

  const { data: security, isLoading } = useQuery({
    queryKey: ["site-settings", "security"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "security")
        .maybeSingle();

      if (error) {
        console.error("Error fetching security settings:", error);
        return defaultSecuritySettings;
      }

      return ((data as any)?.value as SecuritySettings) || defaultSecuritySettings;
    },
  });

  const updateSecurity = useMutation({
    mutationFn: async (newSecurity: Partial<SecuritySettings>) => {
      const current = security || defaultSecuritySettings;
      const updated = { ...current, ...newSecurity };

      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "security")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: updated, updated_at: new Date().toISOString() })
          .eq("key", "security");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "security", value: updated });
        if (error) throw error;
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "security"] });
    },
  });

  return {
    security: security || defaultSecuritySettings,
    isLoading,
    updateSecurity: updateSecurity.mutate,
    isUpdating: updateSecurity.isPending,
  };
}
