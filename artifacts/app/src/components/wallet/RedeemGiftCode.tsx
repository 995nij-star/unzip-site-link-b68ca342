import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Loader2, Sparkles, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function RedeemGiftCode() {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const checkDailyLimit = async (): Promise<boolean> => {
    if (!user) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("redeem_attempts" as any)
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    return (count || 0) >= 10; // Max 10 redeem attempts per day
  };

  const logRedeemAttempt = async (attemptedCode: string, success: boolean) => {
    if (!user) return;
    await supabase.from("redeem_attempts" as any).insert({
      user_id: user.id,
      attempted_code: attemptedCode,
      success,
    });
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setRedeeming(true);
    try {
      // Check daily limit
      const limitReached = await checkDailyLimit();
      if (limitReached) {
        toast({
          title: "Daily Limit Reached",
          description: "You can only attempt 10 redemptions per day. Try again tomorrow.",
          variant: "destructive",
        });
        setRedeeming(false);
        return;
      }

      const { data, error } = await supabase.rpc("redeem_gift_code", {
        p_code: code.trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      // Log the attempt
      await logRedeemAttempt(code.trim(), result.success);

      if (result.success) {
        toast({
          title: "🎉 Gift Card Redeemed!",
          description: result.message,
        });
        setCode("");
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      } else {
        toast({
          title: "Redemption Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      await logRedeemAttempt(code.trim(), false);
      toast({
        title: "Error",
        description: err.message || "Failed to redeem gift card",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="relative p-6 rounded-2xl premium-card overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-gold/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-neon-gold/10">
            <Smartphone className="w-5 h-5 text-neon-gold" />
          </div>
          <div>
            <h3 className="text-lg font-orbitron font-bold text-foreground">
              Redeem Play Store Gift Card
            </h3>
            <p className="text-xs text-muted-foreground font-rajdhani">
              Enter a Play Store gift card code to add funds
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="space-y-3">
          <div className="flex gap-3">
            <CyberInput
              type="text"
              placeholder="Enter gift card code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 uppercase tracking-widest font-mono"
              maxLength={20}
              required
            />
            <CyberButton
              type="submit"
              disabled={redeeming || !code.trim()}
              className="golden-button whitespace-nowrap"
            >
              {redeeming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Redeem
                </>
              )}
            </CyberButton>
          </div>
          <p className="text-xs text-muted-foreground font-rajdhani">
            💰 Redeemed funds are added as <span className="text-neon-green font-medium">real wallet balance</span> and can be used for tournament entries or withdrawals.
          </p>
        </form>
      </div>
    </div>
  );
}
