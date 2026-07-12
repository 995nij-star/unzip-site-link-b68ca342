import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LoginPageSettings {
  welcomeTitle: string;
  welcomeSubtitle: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  footerText: string;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  primaryColor: string; // HSL "H S% L%"
  accentColor: string;
  buttonGradientFrom: string;
  buttonGradientTo: string;
  glassOpacity: number; // 0..1
  glassBlur: number; // px
  borderGlow: number; // 0..1
  showGoogleLogin: boolean;
  showEmailLogin: boolean;
  showRegister: boolean;
  showForgotPassword: boolean;
  showRememberMe: boolean;
  showDarkModeToggle: boolean;
  showLanguageSelector: boolean;
}

export const defaultLoginPageSettings: LoginPageSettings = {
  welcomeTitle: "Welcome Back",
  welcomeSubtitle: "Sign in to continue your journey",
  heroKicker: "WELCOME BACK,",
  heroTitle: "CHAMPIONS NEVER STOP!",
  heroSubtitle: "Sign in to continue your journey and unlock the next level of greatness.",
  footerText: "© 2026 IDEXOPN. All rights reserved.",
  logoUrl: null,
  backgroundImageUrl: null,
  primaryColor: "270 100% 65%",
  accentColor: "210 100% 60%",
  buttonGradientFrom: "270 100% 65%",
  buttonGradientTo: "210 100% 60%",
  glassOpacity: 0.55,
  glassBlur: 24,
  borderGlow: 0.6,
  showGoogleLogin: true,
  showEmailLogin: true,
  showRegister: true,
  showForgotPassword: true,
  showRememberMe: true,
  showDarkModeToggle: true,
  showLanguageSelector: true,
};

export function useLoginPageSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings", "login_page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "login_page")
        .maybeSingle();
      if (error) {
        console.error("login_page settings error", error);
        return defaultLoginPageSettings;
      }
      return { ...defaultLoginPageSettings, ...(((data as any)?.value as Partial<LoginPageSettings>) || {}) };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<LoginPageSettings>) => {
      const current = data || defaultLoginPageSettings;
      const merged = { ...current, ...patch };
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "login_page")
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: merged as any, updated_at: new Date().toISOString() })
          .eq("key", "login_page");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "login_page", value: merged as any });
        if (error) throw error;
      }
      return merged;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings", "login_page"] });
    },
  });

  return {
    settings: data || defaultLoginPageSettings,
    isLoading,
    updateSettings: update.mutate,
    isUpdating: update.isPending,
  };
}
