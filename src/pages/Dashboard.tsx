import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useGlobalCredentials } from "@/hooks/useGlobalCredentials";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { MobileNav } from "@/components/MobileNav";
import { AnnouncementsBanner } from "@/components/AnnouncementsBanner";
import { QuickActionsMenu } from "@/components/QuickActionsMenu";
import { 
  Gamepad2, 
  Trophy, 
  Wallet, 
  Users, 
  LogOut, 
  ChevronRight,
  Zap,
  Target,
  Crown,
  Shield,
  Search,
  Key,
  Copy,
  Check,
  Radio,
  MessageSquare,
  Film,
  UserPlus,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import trophyGold from "@/assets/trophy-gold.png";

import { NeonParticles } from "@/components/NeonParticles";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { useState, useEffect, useRef, forwardRef } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAppVersion } from "@/hooks/useAppVersion";

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  // Update if target changes after counting
  useEffect(() => {
    if (counted.current) setValue(target);
  }, [target]);

  return { value, ref };
}
const AnimatedStatCard = forwardRef<HTMLDivElement, { stat: { label: string; numValue: number; prefix: string; icon: any; color: string; bgColor: string; borderColor: string } }>(
  ({ stat }, _forwardedRef) => {
    const { value: animatedValue, ref } = useCountUp(stat.numValue);
    return (
      <div
        ref={ref}
        className={`group relative p-5 md:p-6 rounded-2xl bg-card/60 backdrop-blur-sm border ${stat.borderColor} premium-halo card-lift overflow-hidden`}
      >
        <div className={`absolute -top-12 -right-12 w-24 h-24 ${stat.bgColor} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <p className="text-2xl md:text-3xl font-orbitron font-bold text-foreground tabular-nums">
            {stat.prefix}{animatedValue.toLocaleString("en-IN")}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground font-rajdhani mt-0.5">
            {stat.label}
          </p>
        </div>
      </div>
    );
  }
);
AnimatedStatCard.displayName = "AnimatedStatCard";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { balance } = useWallet();
  const { isAdmin, hasAdminAccess } = useAdmin();
  const { credentials: globalCreds } = useGlobalCredentials();
  const { profile } = useProfile();
  const { data: appVersion } = useAppVersion();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const features = [
    {
      icon: Trophy,
      title: t("nav.tournaments"),
      description: t("dashboard.joinTournaments"),
      gradient: "from-[hsl(var(--neon-orange))] to-[hsl(var(--neon-pink))]",
      iconBg: "bg-[hsl(var(--neon-orange)/0.12)]",
      iconColor: "text-[hsl(var(--neon-orange))]",
      link: "/tournaments",
    },
    {
      icon: Wallet,
      title: t("nav.wallet"),
      description: t("dashboard.manageWallet"),
      gradient: "from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]",
      iconBg: "bg-[hsl(var(--neon-green)/0.12)]",
      iconColor: "text-[hsl(var(--neon-green))]",
      link: "/wallet",
    },
    {
      icon: Users,
      title: t("nav.leaderboard"),
      description: t("dashboard.viewLeaderboard"),
      gradient: "from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-blue))]",
      iconBg: "bg-[hsl(var(--neon-cyan)/0.12)]",
      iconColor: "text-[hsl(var(--neon-cyan))]",
      link: "/leaderboard",
    },
    {
      icon: Search,
      title: t("nav.search"),
      description: t("dashboard.searchPlayers"),
      gradient: "from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-purple))]",
      iconBg: "bg-[hsl(var(--neon-blue)/0.12)]",
      iconColor: "text-[hsl(var(--neon-blue))]",
      link: "/search",
    },
    {
      icon: Radio,
      title: t("nav.streams"),
      description: t("dashboard.watchStreams"),
      gradient: "from-[hsl(var(--neon-red))] to-[hsl(var(--neon-orange))]",
      iconBg: "bg-[hsl(var(--neon-red)/0.12)]",
      iconColor: "text-[hsl(var(--neon-red))]",
      link: "/streams",
    },
    {
      icon: MessageSquare,
      title: t("nav.messages"),
      description: t("dashboard.sendMessages"),
      gradient: "from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-pink))]",
      iconBg: "bg-[hsl(var(--neon-purple)/0.12)]",
      iconColor: "text-[hsl(var(--neon-purple))]",
      link: "/messages",
    },
    {
      icon: Film,
      title: t("nav.clips"),
      description: t("dashboard.viewClips"),
      gradient: "from-[hsl(var(--neon-pink))] to-[hsl(var(--neon-purple))]",
      iconBg: "bg-[hsl(var(--neon-pink)/0.12)]",
      iconColor: "text-[hsl(var(--neon-pink))]",
      link: "/clips",
    },
    {
      icon: UserPlus,
      title: "Apply for Moderator",
      description: "Help moderate the community",
      gradient: "from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-green))]",
      iconBg: "bg-[hsl(var(--neon-cyan)/0.12)]",
      iconColor: "text-[hsl(var(--neon-cyan))]",
      link: "/moderator-apply",
    },
  ];

  const stats = [
    { label: t("dashboard.tournaments"), numValue: 0, prefix: "", icon: Target, color: "text-[hsl(var(--neon-pink))]", bgColor: "bg-[hsl(var(--neon-pink)/0.1)]", borderColor: "border-[hsl(var(--neon-pink)/0.2)]" },
    { label: t("dashboard.wins"), numValue: 0, prefix: "", icon: Crown, color: "text-[hsl(var(--neon-gold))]", bgColor: "bg-[hsl(var(--neon-gold)/0.1)]", borderColor: "border-[hsl(var(--neon-gold)/0.2)]" },
    { label: t("dashboard.balance"), numValue: Math.round(balance), prefix: "₹", icon: Wallet, color: "text-[hsl(var(--neon-green))]", bgColor: "bg-[hsl(var(--neon-green)/0.1)]", borderColor: "border-[hsl(var(--neon-green)/0.2)]" },
  ];

return (
  <>
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "10px",
        zIndex: 99999,
        background: "black",
        color: "lime",
        padding: "10px",
        fontSize: "12px",
      }}
    >
      isAdmin: {String(isAdmin)}<br />
      hasAdminAccess: {String(hasAdminAccess)}
    </div>

    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/70 border-b border-border/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MobileNav />
              <div className="relative group">
                <Gamepad2 className="w-7 h-7 text-[hsl(var(--neon-blue))] transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-[hsl(var(--neon-blue)/0.25)] blur-xl rounded-full opacity-60" />
              </div>
              <span className="text-lg font-orbitron font-bold text-gradient-neon hidden sm:inline tracking-wide">
                Idexopn
              </span>
            </div>

            <div className="flex items-center gap-2">
              <QuickActionsMenu />
              <PushNotificationToggle />
              <NotificationDropdown />
              <ProfileDropdown />
              {hasAdminAccess && (
                <CyberButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="border-[hsl(var(--neon-purple)/0.4)] hover:border-[hsl(var(--neon-purple)/0.7)] transition-colors"
                >
                  <Shield className="w-4 h-4 text-[hsl(var(--neon-purple))]" />
                  <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Mod'}</span>
                </CyberButton>
              )}
              <CyberButton 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </CyberButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 relative z-10">
        {/* Announcements */}
        <div className="mb-5">
          <AnnouncementsBanner />
        </div>

        {/* Global Credentials */}
        {globalCreds.roomId && globalCreds.roomPassword && (
          <div className="mb-5 p-5 rounded-2xl border border-[hsl(var(--neon-cyan)/0.25)] bg-[hsl(var(--neon-cyan)/0.04)] backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-[hsl(var(--neon-cyan))]" />
              <h3 className="font-orbitron font-bold text-foreground text-sm">
                {globalCreds.label || "Room Credentials"}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Room ID</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground text-lg">{globalCreds.roomId}</span>
                  <button
                    onClick={() => handleCopy(globalCreds.roomId, "roomId")}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--neon-cyan)/0.1)] transition-colors"
                  >
                    {copiedField === "roomId" ? (
                      <Check className="w-4 h-4 text-[hsl(var(--neon-green))]" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Password</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground text-lg">{globalCreds.roomPassword}</span>
                  <button
                    onClick={() => handleCopy(globalCreds.roomPassword, "password")}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--neon-cyan)/0.1)] transition-colors"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-4 h-4 text-[hsl(var(--neon-green))]" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Banner */}
        <div className="relative mb-8 rounded-3xl overflow-hidden sheen">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(260,30%,12%)] via-[hsl(270,30%,8%)] to-[hsl(260,25%,6%)]" />
          
          {/* Animated border */}
          <div className="absolute inset-0 rounded-3xl border-2 border-[hsl(var(--neon-blue)/0.3)] animate-glow-border" />
          
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--neon-blue)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-blue)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
          
          <NeonParticles />
          
          {/* Glow blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[hsl(var(--neon-blue)/0.12)] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[hsl(var(--neon-purple)/0.15)] rounded-full blur-[80px]" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-[hsl(var(--neon-pink)/0.08)] rounded-full blur-[60px]" />
          
          <div className="relative z-10 p-8 md:p-10 flex items-center justify-between">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(var(--neon-cyan)/0.1)] border border-[hsl(var(--neon-cyan)/0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--neon-cyan))]" />
                  <span className="text-xs font-rajdhani font-semibold text-[hsl(var(--neon-cyan))] uppercase tracking-wider">
                    {greeting()}
                  </span>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-foreground leading-tight">
                  Welcome back,{" "}
                  <span className="text-gradient-animated">
                    {profile?.username || "Gamer"}
                  </span>
                </h1>
                <p className="text-muted-foreground font-rajdhani text-base md:text-lg mt-2 max-w-lg leading-relaxed">
                  Your journey to the top continues. Compete, earn, and dominate the arena.
                </p>
              </div>
              
              <div className="flex items-center gap-3 pt-1">
                <Link
                  to="/tournaments"
                  className="sheen inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold text-sm bg-gradient-to-r from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-purple))] text-white shadow-[0_4px_20px_hsl(var(--neon-blue)/0.35)] hover:shadow-[0_6px_30px_hsl(var(--neon-blue)/0.5)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Trophy className="w-4 h-4" />
                  Join Tournament
                </Link>
                <Link
                  to="/clips"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold text-sm bg-card/60 border border-border/50 text-foreground hover:border-[hsl(var(--neon-blue)/0.4)] hover:bg-card/80 transition-all duration-300"
                >
                  <Film className="w-4 h-4" />
                  Watch Clips
                </Link>
              </div>
            </div>
            
            <div className="hidden md:flex items-center justify-center">
              <div className="relative animate-float">
                <img src={trophyGold} alt="Trophy" className="w-44 h-44 object-contain drop-shadow-[0_0_30px_hsl(var(--neon-gold)/0.4)]" />
                <div className="absolute inset-0 bg-[hsl(var(--neon-gold)/0.15)] blur-3xl rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
          {stats.map((stat) => (
            <AnimatedStatCard key={stat.label} stat={stat} />
          ))}
        </div>

        {/* Live Activity Feed */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-card/80 via-card/60 to-card/80 border border-border/40 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[hsl(var(--neon-green)/0.06)] rounded-full blur-[60px]" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[hsl(var(--neon-purple)/0.05)] rounded-full blur-[50px]" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--neon-green))] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--neon-green))]"></span>
                </span>
                <span className="text-xs font-rajdhani font-semibold text-[hsl(var(--neon-green))] uppercase tracking-wider">
                  Live Activity
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Trending Clips */}
              <Link to="/clips/trending" className="group flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/30 hover:border-[hsl(var(--neon-pink)/0.4)] transition-all">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--neon-pink)/0.1)] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--neon-pink))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-rajdhani font-semibold text-foreground">Trending Clips</p>
                  <p className="text-xs text-muted-foreground truncate">Watch top gaming moments</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--neon-pink))] transition-colors" />
              </Link>
              
              {/* Live Streams */}
              <Link to="/streams" className="group flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/30 hover:border-[hsl(var(--destructive)/0.4)] transition-all">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--destructive)/0.1)] flex items-center justify-center relative">
                  <Radio className="w-5 h-5 text-[hsl(var(--destructive))]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(var(--destructive))] rounded-full animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-rajdhani font-semibold text-foreground">Live Streams</p>
                  <p className="text-xs text-muted-foreground truncate">Watch players go live</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--destructive))] transition-colors" />
              </Link>
              
              {/* Discover Creators */}
              <Link to="/discover" className="group flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/30 hover:border-[hsl(var(--neon-purple)/0.4)] transition-all">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--neon-purple)/0.1)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[hsl(var(--neon-purple))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-rajdhani font-semibold text-foreground">Discover Creators</p>
                  <p className="text-xs text-muted-foreground truncate">Find players to follow</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--neon-purple))] transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-purple))]" />
              <h2 className="text-lg font-orbitron font-bold text-foreground">
                Quick Actions
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {features.map((feature, i) => (
              <Link
                key={feature.title}
                to={feature.link}
                className="group relative p-5 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/40 premium-halo card-lift sheen overflow-hidden"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Top gradient line */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${feature.gradient} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Hover background glow */}
                <div className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl ${feature.iconBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  <div className={`w-11 h-11 rounded-xl ${feature.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  
                  <h3 className="text-sm font-orbitron font-bold text-foreground mb-1 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-rajdhani line-clamp-2 mb-3 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className={`flex items-center text-xs ${feature.iconColor} font-rajdhani font-semibold opacity-60 group-hover:opacity-100 group-hover:gap-1.5 transition-all duration-300`}>
                    <span>Open</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>



      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 relative z-10">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground font-rajdhani">
            © 2025 Idexopn. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.06)] text-[hsl(var(--neon-cyan))] font-rajdhani font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" />
              v{appVersion?.version || "1.0.0"}
            </span>
            {appVersion?.release_notes && (
              <span className="text-muted-foreground font-rajdhani truncate max-w-[220px]" title={appVersion.release_notes}>
                — {appVersion.release_notes}
              </span>
            )}
          </div>
          <Link
            to="/help"
            className="text-sm text-muted-foreground hover:text-[hsl(var(--neon-cyan))] transition-colors font-rajdhani"
          >
            Need help? Contact Support
          </Link>
        </div>
      </footer>
 </div>
</>
);
