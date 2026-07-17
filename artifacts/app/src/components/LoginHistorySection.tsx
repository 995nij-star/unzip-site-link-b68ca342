import { forwardRef } from "react";
import { useLoginHistory } from "@/hooks/useLoginHistory";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Shield,
  LogOut,
  Loader2,
  MapPin,
  Clock,
  Fingerprint,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const LoginHistorySection = forwardRef<HTMLDivElement>(function LoginHistorySection(_props, ref) {
  const { history, totalLogins, isLoading, signOutAllDevices } =
    useLoginHistory();

  const handleSignOutAll = async () => {
    try {
      await signOutAllDevices();
      toast({
        title: "Signed out",
        description: "All other devices have been signed out.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out other devices.",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === "mobile") return Smartphone;
    if (deviceType === "tablet") return Tablet;
    return Monitor;
  };

  const getDeviceLabel = (deviceType: string | null) => {
    if (deviceType === "mobile") return "Mobile";
    if (deviceType === "tablet") return "Tablet";
    return "Computer";
  };

  const getDeviceBadgeColor = (deviceType: string | null) => {
    if (deviceType === "mobile") return "bg-neon-orange/15 text-neon-orange border-neon-orange/25";
    if (deviceType === "tablet") return "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/25";
    return "bg-neon-blue/15 text-neon-blue border-neon-blue/25";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl">
      {/* Decorative glow orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-neon-purple/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-neon-blue/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border border-neon-purple/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-neon-purple" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-neon-green border-2 border-background animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-orbitron font-bold text-foreground tracking-wide">
                Session Log
              </h2>
              <p className="text-[11px] text-muted-foreground font-rajdhani mt-0.5">
                {totalLogins} recorded sessions
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOutAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-rajdhani uppercase tracking-wider text-destructive/80 bg-destructive/8 border border-destructive/20 hover:bg-destructive/15 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Revoke All</span>
            <span className="sm:hidden">Revoke</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {/* Login List */}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="relative">
              <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-neon-blue/20 blur-md" />
            </div>
            <p className="text-xs text-muted-foreground font-rajdhani">Loading sessions...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Fingerprint className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-rajdhani">
              No sessions recorded yet
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
            {history.map((record, index) => {
              const DeviceIcon = getDeviceIcon(record.device_type);
              const isLatest = index === 0;

              return (
                <div
                  key={record.id}
                  className={cn(
                    "group relative rounded-xl border p-3.5 transition-all duration-300",
                    isLatest
                      ? "bg-neon-green/[0.04] border-neon-green/25 shadow-[0_0_15px_-5px_hsl(var(--neon-green)/0.15)]"
                      : "bg-background/30 border-border/30 hover:border-border/50 hover:bg-background/50"
                  )}
                >
                  {/* Active session glow line */}
                  {isLatest && (
                    <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-neon-green/80 via-neon-green/40 to-transparent" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Device icon */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isLatest
                          ? "bg-neon-green/10 border border-neon-green/20"
                          : "bg-muted/30 border border-border/30 group-hover:bg-muted/50"
                      )}
                    >
                      <DeviceIcon
                        className={cn(
                          "w-4 h-4",
                          isLatest ? "text-neon-green" : "text-muted-foreground group-hover:text-foreground/70"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Device name + badges */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <p className="text-sm font-rajdhani font-semibold text-foreground truncate leading-tight">
                          {record.device_name || "Unknown Device"}
                        </p>
                        <Badge className={cn("text-[9px] px-1.5 py-0 font-rajdhani font-bold uppercase tracking-wider rounded-md border", getDeviceBadgeColor(record.device_type))}>
                          {getDeviceLabel(record.device_type)}
                        </Badge>
                        {isLatest && (
                          <Badge className="bg-neon-green/15 text-neon-green border-neon-green/25 text-[9px] px-1.5 py-0 font-rajdhani font-bold uppercase tracking-wider rounded-md">
                            Live
                          </Badge>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {(record.city || record.country) && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-rajdhani">
                            <MapPin className="w-3 h-3 text-neon-orange/60" />
                            {[record.city, record.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {record.ip_address && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-rajdhani">
                            <Wifi className="w-3 h-3 text-neon-cyan/60" />
                            <span className="font-mono text-[10px]">{record.ip_address}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-rajdhani">
                          <Clock className="w-3 h-3 text-neon-purple/60" />
                          {format(
                            new Date(record.logged_in_at),
                            "MMM dd, HH:mm"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
LoginHistorySection.displayName = "LoginHistorySection";
