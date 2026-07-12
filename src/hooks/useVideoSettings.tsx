import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VideoSettings {
  maxFileSizeMB: number;
  maxDurationSeconds: number;
  allow4K: boolean;
  allowedFormats: string[];
}

const defaultVideoSettings: VideoSettings = {
  maxFileSizeMB: 300,
  maxDurationSeconds: 60,
  allow4K: true,
  allowedFormats: ["video/mp4", "video/quicktime", "video/webm"],
};

export function useVideoSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings", "video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "video")
        .maybeSingle();

      if (error || !data) return defaultVideoSettings;
      return ((data as any)?.value as VideoSettings) || defaultVideoSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<VideoSettings>) => {
      const current = settings || defaultVideoSettings;
      const updated = { ...current, ...newSettings };

      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "video")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: updated, updated_at: new Date().toISOString() })
          .eq("key", "video");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "video", value: updated as any });
        if (error) throw error;
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "video"] });
    },
  });

  return {
    settings: settings || defaultVideoSettings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}

// Helper to validate a file against settings
export function validateVideoFile(
  file: File,
  settings: VideoSettings
): { valid: boolean; error?: string } {
  const allowedMimeTypes = settings.allowedFormats;
  if (!allowedMimeTypes.includes(file.type)) {
    const formatNames = allowedMimeTypes.map((m) => {
      if (m === "video/mp4") return "MP4";
      if (m === "video/quicktime") return "MOV";
      if (m === "video/webm") return "WebM";
      return m;
    });
    return { valid: false, error: `Supported formats: ${formatNames.join(", ")}` };
  }

  const maxBytes = settings.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Maximum file size is ${settings.maxFileSizeMB}MB` };
  }

  return { valid: true };
}

// Helper to validate video duration
export function validateVideoDuration(
  duration: number,
  settings: VideoSettings
): { valid: boolean; error?: string } {
  if (duration > settings.maxDurationSeconds) {
    return { valid: false, error: `Video must be ${settings.maxDurationSeconds} seconds or less` };
  }
  return { valid: true };
}

// Helper to check resolution
export function validateVideoResolution(
  width: number,
  height: number,
  settings: VideoSettings
): { valid: boolean; error?: string } {
  if (!settings.allow4K && (width > 1920 || height > 1080)) {
    return { valid: false, error: "4K uploads are currently disabled. Maximum resolution: 1920×1080" };
  }
  if (width > 3840 || height > 2160) {
    return { valid: false, error: "Maximum resolution is 3840×2160 (4K)" };
  }
  return { valid: true };
}
