import { ShieldAlert, Unlock, Clock } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";
import { format } from "date-fns";

interface EmergencyBannerProps {
  active: boolean;
  lastActivatedAt?: string | null;
  onDeactivate: () => void;
}

export function EmergencyBanner({ active, lastActivatedAt, onDeactivate }: EmergencyBannerProps) {
  if (!active) return null;

  return (
    <div className="mb-6 p-5 rounded-xl bg-destructive/15 border-2 border-destructive/60 relative overflow-hidden">
      {/* Animated pulse border */}
      <div className="absolute inset-0 rounded-xl border-2 border-destructive animate-pulse pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-destructive/20 border border-destructive/40">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <p className="font-orbitron font-bold text-destructive text-lg tracking-wide">
              EMERGENCY LOCK ACTIVE
            </p>
            <p className="text-sm text-destructive/70 font-rajdhani">
              All platform systems are currently disabled.
            </p>
            {lastActivatedAt && (
              <p className="text-xs text-muted-foreground font-rajdhani mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Activated {format(new Date(lastActivatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        </div>
        <CyberButton
          variant="outline"
          onClick={onDeactivate}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          <Unlock className="w-4 h-4" /> Deactivate
        </CyberButton>
      </div>
    </div>
  );
}
