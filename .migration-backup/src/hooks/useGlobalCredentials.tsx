import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalCredentials {
  roomId: string;
  roomPassword: string;
  label: string;
}

const defaultCredentials: GlobalCredentials = {
  roomId: "",
  roomPassword: "",
  label: "Room Credentials",
};

export function useGlobalCredentials() {
  const queryClient = useQueryClient();

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["site-settings", "global-credentials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "global_credentials")
        .maybeSingle();

      if (error) {
        console.error("Error fetching global credentials:", error);
        return defaultCredentials;
      }

      return ((data as any)?.value as GlobalCredentials) || defaultCredentials;
    },
  });

  const updateCredentials = useMutation({
    mutationFn: async (newCreds: Partial<GlobalCredentials>) => {
      const current = credentials || defaultCredentials;
      const updated = { ...current, ...newCreds };

      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "global_credentials")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: updated, updated_at: new Date().toISOString() })
          .eq("key", "global_credentials");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "global_credentials", value: updated });
        if (error) throw error;
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "global-credentials"] });
    },
  });

  return {
    credentials: credentials || defaultCredentials,
    isLoading,
    updateCredentials: updateCredentials.mutate,
    isUpdating: updateCredentials.isPending,
  };
}
