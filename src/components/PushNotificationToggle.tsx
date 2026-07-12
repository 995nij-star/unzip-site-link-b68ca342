import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications();

  // Don't show if not supported or if permission was permanently denied
  if (!isSupported) return null;

  const isDenied = permission === "denied";

  return (
    <button
      disabled={loading || isDenied}
      onClick={isSubscribed ? unsubscribe : subscribe}
      title={isDenied ? "Notifications blocked — enable in browser settings" : isSubscribed ? "Disable notifications" : "Enable notifications"}
      className={cn(
        "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-300",
        "border backdrop-blur-md",
        isDenied
          ? "border-destructive/30 bg-destructive/10 text-destructive/60 cursor-not-allowed opacity-60"
          : isSubscribed
            ? "border-neon-green/40 bg-[hsl(145_100%_45%/0.08)] text-[hsl(var(--neon-green))] hover:bg-[hsl(145_100%_45%/0.15)] hover:shadow-[0_0_12px_hsl(145_100%_45%/0.25)]"
            : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
      )}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isDenied ? (
        <BellOff className="w-3 h-3" />
      ) : isSubscribed ? (
        <BellRing className="w-3 h-3" />
      ) : (
        <Bell className="w-3 h-3" />
      )}
      <span className="hidden sm:inline">
        {isDenied ? "Blocked" : isSubscribed ? "On" : "Notify"}
      </span>
      {isSubscribed && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[hsl(var(--neon-green))] shadow-[0_0_6px_hsl(145_100%_45%/0.6)]" />
      )}
    </button>
  );
}
