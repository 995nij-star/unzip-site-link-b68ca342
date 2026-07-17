import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, CreditCard } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/moneyTransfer";
import { usePaymentMethodLocks } from "@/hooks/usePaymentMethodLocks";
import { toast } from "sonner";

export default function AdminPaymentMethods() {
  const { isEnabled, setEnabled, loading } = usePaymentMethodLocks();
  const [pending, setPending] = useState<string | null>(null);

  const handleToggle = async (methodId: string, label: string, next: boolean) => {
    setPending(methodId);
    try {
      await setEnabled(methodId, next);
      toast.success(
        next
          ? `${label} enabled for all users`
          : `${label} disabled and locked for all users`
      );
    } catch (err: any) {
      toast.error(`Failed to update ${label}: ${err?.message ?? "unknown error"}`);
    } finally {
      setPending(null);
    }
  };

  return (
    <AdminLayout
      title="Payment Methods"
      description="Toggle a method off to lock it for every user in real time."
    >
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <header className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shadow-lg shadow-primary/30">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-orbitron font-bold text-foreground">
              Payment Methods
            </h1>
            <p className="text-sm text-muted-foreground font-rajdhani">
              Toggle a method off to lock it for every user in real time.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((pm) => {
            const enabled = isEnabled(pm.id);
            const isPending = pending === pm.id;
            return (
              <div
                key={pm.id}
                className="premium-card p-4 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl">{pm.icon}</div>
                  <div className="min-w-0">
                    <div className="font-rajdhani font-semibold text-foreground flex items-center gap-2">
                      {pm.label}
                      {enabled ? (
                        <Unlock className="w-3.5 h-3.5 text-neon-green" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {enabled ? "Enabled — users can select" : "Disabled — locked for all users"}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  disabled={loading || isPending}
                  onCheckedChange={(v) => handleToggle(pm.id, pm.label, v)}
                  aria-label={`Toggle ${pm.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
