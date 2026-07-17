import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationTracker } from "@/hooks/useLocationTracker";
import { useAuth } from "@/hooks/useAuth";

const SNOOZE_KEY = "location_prompt_snoozed_until";

export function LocationPermissionPrompt() {
  const { user } = useAuth();
  const { permission, loading, requestLocation } = useLocationTracker();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (until > Date.now()) setDismissed(true);
  }, []);

  if (!user) return null;
  if (dismissed) return null;
  if (permission !== "prompt" && permission !== "denied") return null;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 1000 * 60 * 60 * 24));
    setDismissed(true);
  };

  const handleAllow = async () => {
    const ok = await requestLocation();
    if (ok) setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
      <div className="relative rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20 p-4">
        <button
          onClick={snooze}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              {permission === "denied" ? "Location access blocked" : "Share your location"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {permission === "denied"
                ? "You previously denied location access. Enable it in your browser settings, then tap Allow."
                : "Help us show region-based tournaments and improve security. You can change this anytime."}
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow} disabled={loading} className="h-8">
                {loading ? "Locating…" : "Allow"}
              </Button>
              <Button size="sm" variant="ghost" onClick={snooze} className="h-8">
                Not now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
