import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LoginRecord {
  id: string;
  browser: string | null;
  os: string | null;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  logged_in_at: string;
}

export function useLoginHistory() {
  const { user } = useAuth();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["login-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_in_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching login history:", error);
        return [];
      }
      return data as unknown as LoginRecord[];
    },
    enabled: !!user,
  });

  const totalLogins = history.length;

  const signOutAllDevices = async () => {
    // Signs out all sessions except current
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) throw error;
  };

  const trackLogin = async () => {
    if (!user) return;
    try {
      await supabase.functions.invoke("track-login", {
        body: { userAgent: navigator.userAgent },
      });
    } catch (err) {
      console.error("Failed to track login:", err);
    }
  };

  return {
    history,
    totalLogins,
    isLoading,
    signOutAllDevices,
    trackLogin,
  };
}
