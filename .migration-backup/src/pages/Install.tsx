import { useState, useEffect } from "react";
import { Download, Smartphone, Share, MoreVertical, Zap, Trophy, Wallet, Shield, ArrowLeft, Chrome, Star, Globe, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let _savedPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _savedPrompt = e as BeforeInstallPromptEvent;
  });
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(_savedPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // If already in standalone, just go home
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      navigate("/", { replace: true });
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      _savedPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => navigate("/", { replace: true }));

    if (_savedPrompt) setDeferredPrompt(_savedPrompt);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [navigate]);

  // Don't auto-trigger - let user click the button manually

  const handleInstall = async () => {
    if (!deferredPrompt || installing) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        navigate("/", { replace: true });
      }
    } catch (e) {
      console.error("Install prompt failed:", e);
    }
    setDeferredPrompt(null);
    _savedPrompt = null;
    setInstalling(false);
  };

  const features = [
    { icon: Zap, title: "Instant Launch", desc: "Opens from home screen", color: "text-yellow-400" },
    { icon: Trophy, title: "Push Alerts", desc: "Never miss a tournament", color: "text-emerald-400" },
    { icon: Wallet, title: "Quick Wallet", desc: "One-tap access", color: "text-blue-400" },
    { icon: Shield, title: "Works Offline", desc: "No internet needed", color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-orbitron font-bold text-foreground">Install App</h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {/* App Icon + Info */}
        <div className="text-center space-y-3">
          <div className="w-24 h-24 mx-auto rounded-[1.5rem] overflow-hidden shadow-2xl shadow-primary/30 border-2 border-primary/20">
            <img src="/pwa-icon-512.png" alt="Idexopn" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-orbitron text-foreground">Idexopn</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gaming Tournament Platform</p>
          </div>
          <div className="flex items-center justify-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
            <span className="text-xs text-muted-foreground ml-1">4.9</span>
          </div>
        </div>

        {/* Direct Install Button */}
        <div className="space-y-3">
          {deferredPrompt || installing ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="w-full gap-3 h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/30"
              size="lg"
            >
              {installing ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {installing ? "Installing..." : "Install Now"}
            </Button>
          ) : isIOS ? (
            <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <p className="font-semibold text-sm text-foreground">Install on iPhone / iPad</p>
              </div>
              <div className="space-y-2.5">
                <Step num={1} icon={<Share className="w-4 h-4" />} text='Tap Share in Safari' />
                <Step num={2} icon={<Download className="w-4 h-4" />} text='"Add to Home Screen"' />
                <Step num={3} icon={<Globe className="w-4 h-4" />} text='Tap "Add" to confirm' />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-2">
                <Chrome className="w-5 h-5 text-primary" />
                <p className="font-semibold text-sm text-foreground">Install from Chrome</p>
              </div>
              <div className="space-y-2.5">
                <Step num={1} icon={<MoreVertical className="w-4 h-4" />} text='Tap menu (⋮) in Chrome' />
                <Step num={2} icon={<Download className="w-4 h-4" />} text='Tap "Install app"' />
                <Step num={3} icon={<Globe className="w-4 h-4" />} text='Tap "Install" to confirm' />
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                💡 If "Install app" doesn't appear, refresh the page first.
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2.5">
          {features.map(({ icon: Icon, title, desc, color }, i) => (
            <div key={title} className="p-3 rounded-xl bg-card border border-border/50 space-y-1.5">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="font-semibold text-xs text-foreground">{title}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* APK Download Option for Android */}
        {!isIOS && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Prefer APK?</p>
                <p className="text-[11px] text-muted-foreground">Direct download for Android</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/download-apk")}
                className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              >
                <Download className="w-4 h-4 mr-1.5" />
                APK
              </Button>
            </div>
          </div>
        )}

        {/* App info */}
        <div className="flex justify-between text-[11px] text-muted-foreground/60 px-1">
          <span>Size: ~5 MB</span>
          <span>Free • No ads</span>
          <span>v2.0</span>
        </div>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground text-sm">
          Continue in browser
        </Button>
      </div>
    </div>
  );
};

function Step({ num, icon, text }: { num: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
        {num}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-primary shrink-0">{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

export default Install;
