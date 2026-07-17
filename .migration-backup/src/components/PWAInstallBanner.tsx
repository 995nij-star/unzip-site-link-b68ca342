import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone, Share, Chrome, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global ref so the event is captured even before the component mounts
let _deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem("pwa-banner-dismissed");
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      _deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    if (_deferredPrompt) setDeferredPrompt(_deferredPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    _deferredPrompt = null;
    setInstalling(false);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20 p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-primary/20 shadow-lg shadow-primary/20">
            <img src="/pwa-icon-192.png" alt="Idexopn" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <p className="font-orbitron font-bold text-foreground text-sm">Install Idexopn</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to home screen • Works offline
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 gap-2 rounded-xl h-10 font-bold shadow-lg shadow-primary/20"
              size="sm"
            >
              {installing ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {installing ? "Installing..." : "Install Now"}
            </Button>
          ) : isIOS ? (
            <Button
              onClick={() => setShowIOSTip(!showIOSTip)}
              className="flex-1 gap-2 rounded-xl h-10"
              variant="outline"
              size="sm"
            >
              <Smartphone className="w-4 h-4" /> How to Install
            </Button>
          ) : null}
        </div>

        {showIOSTip && isIOS && (
          <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Share className="w-4 h-4 text-primary shrink-0" />
              <span>Tap <strong className="text-foreground">Share</strong> in Safari</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Download className="w-4 h-4 text-primary shrink-0" />
              <span>Select <strong className="text-foreground">"Add to Home Screen"</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
