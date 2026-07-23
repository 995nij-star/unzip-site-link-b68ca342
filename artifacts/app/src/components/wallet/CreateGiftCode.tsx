import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Gift, Loader2, Copy, Check, Ticket, AlertTriangle, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function CreateGiftCode() {
  const [amount, setAmount] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [creating, setCreating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { balance, refetch } = useWallet();

  const totalCost = (Number(amount) || 0) * (Number(maxUses) || 1);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    const uses = Number(maxUses);

    if (amt < 10) {
      toast({ title: "Minimum ₹10", description: "Gift card amount must be at least ₹10.", variant: "destructive" });
      return;
    }
    if (totalCost > balance) {
      toast({ title: "Insufficient balance", description: `Total cost is ₹${totalCost} but you have ₹${balance.toFixed(2)}.`, variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await (supabase as any).rpc("create_user_gift_code", {
        p_amount: amt,
        p_max_uses: uses,
      });

      if (error) throw error;

      const result = data as { success: boolean; code?: string; error?: string; total_cost?: number };

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setAmount("");
        setMaxUses("1");
        refetch();
        toast({ title: "🎁 Play Store Gift Card Created!", description: `Code: ${result.code}` });
      } else {
        toast({ title: "Failed", description: result.error || "Could not create gift card", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="relative p-6 rounded-2xl premium-card overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-neon-cyan/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-neon-cyan/10">
              <Smartphone className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h3 className="text-lg font-orbitron font-bold text-foreground">
                Create Play Store Gift Card
              </h3>
              <p className="text-xs text-muted-foreground font-rajdhani">
                Convert wallet balance into a shareable gift card code (min ₹10)
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground font-rajdhani mb-1 block">
                  Amount (₹)
                </label>
                <CyberInput
                  type="number"
                  placeholder="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={10}
                  required
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-muted-foreground font-rajdhani mb-1 block">
                  Max Uses
                </label>
                <CyberInput
                  type="number"
                  placeholder="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min={1}
                  max={100}
                  required
                />
              </div>
            </div>

            {totalCost > 0 && (
              <p className="text-xs font-rajdhani text-muted-foreground">
                Total cost: <span className={totalCost > balance ? "text-destructive" : "text-neon-green"}>₹{totalCost}</span>
              </p>
            )}

            {/* Real money warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/20">
              <AlertTriangle className="w-4 h-4 text-neon-orange shrink-0 mt-0.5" />
              <p className="text-xs text-neon-orange font-rajdhani">
                <span className="font-bold">Real Money:</span> This amount will be permanently deducted from your wallet balance. Gift cards are non-refundable once created.
              </p>
            </div>

            <CyberButton
              type="submit"
              disabled={creating || !amount || totalCost > balance || Number(amount) < 10}
              className="w-full"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-1" />
                  Create Gift Card
                </>
              )}
            </CyberButton>
          </form>
        </div>
      </div>

      <Dialog open={!!generatedCode} onOpenChange={() => { setGeneratedCode(null); setCopied(false); }}>
        <DialogContent className="premium-card border-neon-cyan/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-neon-cyan">🎁 Play Store Gift Card Created!</DialogTitle>
            <DialogDescription className="font-rajdhani">
              Share this code with someone to gift them wallet funds.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-4 rounded-xl bg-background/50 border border-neon-cyan/20">
            <code className="flex-1 text-xl font-mono font-bold text-foreground tracking-widest text-center">
              {generatedCode}
            </code>
            <CyberButton size="icon" variant="ghost" onClick={copyCode}>
              {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
            </CyberButton>
          </div>
          <p className="text-xs text-muted-foreground font-rajdhani text-center">
            This gift card expires in 30 days.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
