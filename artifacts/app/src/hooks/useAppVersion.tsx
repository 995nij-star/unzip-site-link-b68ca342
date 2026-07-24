import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppVersion {
  version: string;
  release_notes: string;
  released_at: string | null;
}

const DEFAULT_VERSION: AppVersion = {
  version: "1.0.0",
  release_notes: "",
  released_at: null,
};

/**
 * Public hook — reads the current app version from the public view.
 * Anyone (including guests) can read it.
 */
export function useAppVersion() {
  return useQuery({
    queryKey: ["app_version"],
    queryFn: async (): Promise<AppVersion> => {
      const { data, error } = await supabase
        .from("site_settings_public")
        .select("value")
        .eq("key", "app_version")
        .maybeSingle();

      if (error) throw error;
      const value = (data?.value ?? {}) as Partial<AppVersion>;
      return {
        version: value.version || DEFAULT_VERSION.version,
        release_notes: value.release_notes || "",
        released_at: value.released_at ?? null,
      };
    },
    staleTime: 60_000,
  });
}

