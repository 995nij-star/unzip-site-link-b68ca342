import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export function useKycStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kyc-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      const status: KycStatus = (data?.status as KycStatus) || "none";
      return { record: data, status };
    },
  });
}
