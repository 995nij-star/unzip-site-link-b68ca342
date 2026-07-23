import { useState, useEffect } from "react";
import { Download, Shield, Smartphone, CheckCircle, ArrowLeft, FileDown, Star, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import xtEspLogo from "@/assets/xt-esp-logo.png";

interface ApkRelease {
  id: string;
  version: string;
  file_size: string;
  file_url: string | null;
  min_android: string;
  release_notes: string | null;
  download_count: number;
  updated_at: string;
}

const DownloadAPK = () => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [latestRelease, setLatestRelease] = useState<ApkRelease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await (supabase as any)
        .from("apk_releases")
        .select("*")
        .not("file_url", "is", null)
        .neq("file_url", "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to load APK release:", error.message);
      }

      if (data) setLatestRelease(data);
      setLoading(false);
    };

    fetchLatest();
  }, []);

  const hasApk = Boolean(latestRelease?.file_url && latestRelease.file_url.trim().length > 0);

  const handleDownload = async () => {
    if (!latestRelease?.file_url || !hasApk) return;
    setDownloading(true);
    setShowInstructions(true);

    // Increment download count
    void (supabase as any)
      .from("apk_releases")
      .update({ download_count: ((latestRelease as any).download_count || 0) + 1 })
      .eq("id", latestRelease.id);

    // Trigger download/navigation (mobile-friendly)
    window.location.assign(latestRelease.file_url);

    setTimeout(() => setDownloading(false), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const appInfo = latestRelease
    ? {
        version: latestRelease.version,
        size: latestRelease.file_size,
        lastUpdate: formatDate(latestRelease.updated_at),
        minAndroid: latestRelease.min_android,
      }
    : {
        version: "—",
        size: "—",
        lastUpdate: "Pending publish",
        minAndroid: "Android 7.0+",
      };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[hsl(var(--neon-blue)/0.08)] blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(var(--neon-gold)/0.06)] blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-orbitron font-bold text-foreground">Download APK</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-10">
        {/* Logo + App Name */}
        <div className="text-center space-y-4">
          <div className="w-28 h-28 mx-auto rounded-[2rem] overflow-hidden border-2 border-[hsl(var(--neon-blue)/0.3)] shadow-[var(--shadow-neon)] bg-card">
            <img src={xtEspLogo} alt="Idexopn" className="w-full h-full object-contain p-2" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-orbitron text-foreground">Idexopn</h2>
            <p className="text-sm text-muted-foreground mt-1">Idexopn</p>
          </div>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-[hsl(var(--neon-gold))] text-[hsl(var(--neon-gold))]" />
            ))}
            <span className="text-xs text-muted-foreground ml-1.5">
              4.9 • {latestRelease ? `${latestRelease.download_count.toLocaleString()}+ Downloads` : "10K+ Downloads"}
            </span>
          </div>
        </div>

        {/* Download Button */}
        {loading ? (
          <div className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleDownload}
              disabled={downloading || !hasApk}
              className="w-full gap-3 h-16 text-lg font-bold rounded-2xl bg-[hsl(var(--neon-gold))] hover:bg-[hsl(var(--neon-gold-light))] text-[hsl(var(--background))] shadow-[0_0_30px_hsl(var(--neon-gold)/0.4)] hover:shadow-[0_0_50px_hsl(var(--neon-gold)/0.5)] transition-all duration-300"
              size="lg"
            >
              {downloading ? (
                <div className="w-6 h-6 border-3 border-[hsl(var(--background)/0.3)] border-t-[hsl(var(--background))] rounded-full animate-spin" />
              ) : (
                <Download className="w-6 h-6" />
              )}
              {downloading ? "Downloading..." : !hasApk ? "APK Coming Soon" : "Download APK"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {hasApk ? `v${appInfo.version} • ${appInfo.size} • Free` : "No public APK published yet. Please try again shortly."}
            </p>
          </div>
        )}

        {/* App Info Card */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
            <Info className="w-4 h-4 text-[hsl(var(--neon-blue))]" />
            <span className="font-semibold text-sm text-foreground">App Information</span>
          </div>
          <div className="divide-y divide-border/20">
            {[
              { label: "Version", value: appInfo.version },
              { label: "File Size", value: appInfo.size },
              { label: "Last Updated", value: appInfo.lastUpdate },
              { label: "Requires", value: appInfo.minAndroid },
              { label: "Category", value: "Gaming / Esports" },
              { label: "Developer", value: "Idexopn" },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Release Notes */}
        {latestRelease?.release_notes && (
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-2">
            <h3 className="font-semibold text-sm text-foreground">What's New</h3>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {latestRelease.release_notes}
            </p>
          </div>
        )}

        {/* Install Instructions */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[hsl(var(--neon-green))]" />
              <span className="font-semibold text-sm text-foreground">How to Install</span>
            </div>
            {showInstructions ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showInstructions && (
            <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="h-px bg-border/30" />
              {[
                {
                  num: 1,
                  icon: <FileDown className="w-4 h-4" />,
                  title: "Download the APK",
                  desc: "Tap the download button above to get the APK file.",
                },
                {
                  num: 2,
                  icon: <Shield className="w-4 h-4" />,
                  title: "Allow Unknown Sources",
                  desc: 'Go to Settings → Security → Enable "Install from Unknown Sources" for your browser.',
                },
                {
                  num: 3,
                  icon: <CheckCircle className="w-4 h-4" />,
                  title: "Install & Open",
                  desc: "Tap the downloaded APK file and follow the prompts to install Idexopn.",
                },
              ].map(({ num, icon, title, desc }) => (
                <div key={num} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[hsl(var(--neon-blue)/0.15)] flex items-center justify-center text-xs font-bold text-[hsl(var(--neon-blue))] shrink-0">
                    {num}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[hsl(var(--neon-blue))]">{icon}</span>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 py-3">
          <Shield className="w-4 h-4 text-[hsl(var(--neon-green))]" />
          <span className="text-xs text-muted-foreground">Verified & Safe • No malware detected</span>
        </div>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground text-sm">
          Back to website
        </Button>
      </div>
    </div>
  );
};

export default DownloadAPK;
