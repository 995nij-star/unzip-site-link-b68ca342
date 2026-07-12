import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  darkMode: boolean;
  headingFont: string;
  bodyFont: string;
}

export interface PaymentSettings {
  upiId: string;
  qrCodeUrl: string | null;
}

export const fontOptions = [
  { value: "Orbitron", label: "Orbitron", category: "display" },
  { value: "Rajdhani", label: "Rajdhani", category: "sans" },
  { value: "Inter", label: "Inter", category: "sans" },
  { value: "Roboto", label: "Roboto", category: "sans" },
  { value: "Poppins", label: "Poppins", category: "sans" },
  { value: "Montserrat", label: "Montserrat", category: "sans" },
  { value: "Space Grotesk", label: "Space Grotesk", category: "sans" },
  { value: "Bebas Neue", label: "Bebas Neue", category: "display" },
  { value: "Russo One", label: "Russo One", category: "display" },
  { value: "Audiowide", label: "Audiowide", category: "display" },
  { value: "Press Start 2P", label: "Press Start 2P", category: "display" },
  { value: "Exo 2", label: "Exo 2", category: "sans" },
  { value: "Chakra Petch", label: "Chakra Petch", category: "sans" },
  { value: "Teko", label: "Teko", category: "display" },
];

const defaultTheme: ThemeSettings = {
  primaryColor: "210 100% 55%",
  secondaryColor: "220 15% 15%",
  backgroundColor: "220 20% 4%",
  buttonColor: "210 100% 55%",
  logoUrl: null,
  bannerUrl: null,
  darkMode: true,
  headingFont: "Orbitron",
  bodyFont: "Rajdhani",
};

const defaultPaymentSettings: PaymentSettings = {
  upiId: "8415965913@fam",
  qrCodeUrl: null,
};

export function useSiteSettings() {
  const queryClient = useQueryClient();

  const { data: theme, isLoading } = useQuery({
    queryKey: ["site-settings", "theme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "theme")
        .single();

      if (error) {
        console.error("Error fetching theme settings:", error);
        return defaultTheme;
      }

      return ((data as any)?.value as ThemeSettings) || defaultTheme;
    },
  });

  const updateTheme = useMutation({
    mutationFn: async (newTheme: Partial<ThemeSettings>) => {
      const currentTheme = theme || defaultTheme;
      const updatedTheme = { ...currentTheme, ...newTheme };

      const { error } = await supabase
        .from("site_settings")
        .update({ value: updatedTheme, updated_at: new Date().toISOString() })
        .eq("key", "theme");

      if (error) throw error;
      return updatedTheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "theme"] });
    },
  });

  const uploadAsset = async (file: File, type: "logo" | "banner" | "qrcode") => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("site-assets")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  return {
    theme: theme || defaultTheme,
    isLoading,
    updateTheme: updateTheme.mutate,
    isUpdating: updateTheme.isPending,
    uploadAsset,
  };
}

// Separate hook for payment settings
export function usePaymentSettings() {
  const queryClient = useQueryClient();

  const { data: payment, isLoading } = useQuery({
    queryKey: ["site-settings", "payment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "payment")
        .maybeSingle();

      if (error) {
        console.error("Error fetching payment settings:", error);
        return defaultPaymentSettings;
      }

      return ((data as any)?.value as PaymentSettings) || defaultPaymentSettings;
    },
  });

  const updatePayment = useMutation({
    mutationFn: async (newPayment: Partial<PaymentSettings>) => {
      const currentPayment = payment || defaultPaymentSettings;
      const updatedPayment = { ...currentPayment, ...newPayment };

      // Check if payment setting exists
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "payment")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: updatedPayment, updated_at: new Date().toISOString() })
          .eq("key", "payment");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "payment", value: updatedPayment });
        if (error) throw error;
      }

      return updatedPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "payment"] });
    },
  });

  const uploadQrCode = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `qrcode-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("site-assets")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  return {
    payment: payment || defaultPaymentSettings,
    isLoading,
    updatePayment: updatePayment.mutate,
    isUpdating: updatePayment.isPending,
    uploadQrCode,
  };
}
