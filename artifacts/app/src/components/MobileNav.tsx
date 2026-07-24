import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CyberButton } from "@/components/ui/cyber-button";
import {
  Menu,
  Trophy,
  Wallet,
  Users,
  Search,
  HelpCircle,
  Home,
  History,
  LogOut,
  Gamepad2,
  Download,
  ChevronRight,
  Video,
  Radio,
  MessageCircle,
} from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate("/login");
  };

  const navItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", color: "from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-cyan))]", iconColor: "text-[hsl(var(--neon-blue))]", activeBg: "bg-[hsl(var(--neon-blue)/0.1)]" },
    { icon: Trophy, label: "Tournaments", href: "/tournaments", color: "from-[hsl(var(--neon-orange))] to-[hsl(var(--neon-pink))]", iconColor: "text-[hsl(var(--neon-orange))]", activeBg: "bg-[hsl(var(--neon-orange)/0.1)]" },
    { icon: Video, label: "Clips", href: "/clips", color: "from-[hsl(var(--neon-pink))] to-[hsl(var(--neon-orange))]", iconColor: "text-[hsl(var(--neon-pink))]", activeBg: "bg-[hsl(var(--neon-pink)/0.1)]" },
    { icon: Radio, label: "Live Streams", href: "/streams", color: "from-[hsl(var(--destructive))] to-[hsl(var(--neon-orange))]", iconColor: "text-[hsl(var(--destructive))]", activeBg: "bg-[hsl(var(--destructive)/0.1)]" },
    { icon: MessageCircle, label: "Messages", href: "/messages", color: "from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-blue))]", iconColor: "text-[hsl(var(--neon-cyan))]", activeBg: "bg-[hsl(var(--neon-cyan)/0.1)]" },
    { icon: Wallet, label: "Wallet", href: "/wallet", color: "from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]", iconColor: "text-[hsl(var(--neon-green))]", activeBg: "bg-[hsl(var(--neon-green)/0.1)]" },
    { icon: Users, label: "Leaderboard", href: "/leaderboard", color: "from-[hsl(var(--neon-gold))] to-[hsl(var(--neon-orange))]", iconColor: "text-[hsl(var(--neon-gold))]", activeBg: "bg-[hsl(var(--neon-gold)/0.1)]" },
    { icon: Search, label: "Find Player", href: "/search", color: "from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-pink))]", iconColor: "text-[hsl(var(--neon-purple))]", activeBg: "bg-[hsl(var(--neon-purple)/0.1)]" },
    { icon: History, label: "Session Log", href: "/sessions", color: "from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-blue))]", iconColor: "text-[hsl(var(--neon-purple))]", activeBg: "bg-[hsl(var(--neon-purple)/0.1)]" },
    { icon: HelpCircle, label: "Help Center", href: "/help", color: "from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-blue))]", iconColor: "text-[hsl(var(--neon-cyan))]", activeBg: "bg-[hsl(var(--neon-cyan)/0.1)]" },
    { icon: Download, label: "Install App", href: "/install", color: "from-[hsl(var(--neon-pink))] to-[hsl(var(--neon-purple))]", iconColor: "text-[hsl(var(--neon-pink))]", activeBg: "bg-[hsl(var(--neon-pink)/0.1)]" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <CyberButton variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </CyberButton>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[280px] p-0 border-r border-[hsl(var(--neon-blue)/0.15)] bg-black"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-6 pb-5 border-b border-border/40">
          <SheetTitle className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-blue)/0.15)] to-[hsl(var(--neon-purple)/0.15)] flex items-center justify-center border border-[hsl(var(--neon-blue)/0.25)]">
              <Gamepad2 className="w-5 h-5 text-[hsl(var(--neon-blue))]" />
              <div className="absolute inset-0 bg-[hsl(var(--neon-blue)/0.15)] blur-xl rounded-full" />
            </div>
            <div>
              <span className="text-lg font-orbitron font-bold text-gradient-neon block leading-tight">
                Idexopn
              </span>
              <span className="text-[10px] font-rajdhani text-muted-foreground tracking-wider uppercase">
                Gaming Platform
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 font-rajdhani font-medium
                  ${isActive
                    ? `${item.activeBg} border border-[hsl(var(--neon-blue)/0.2)]`
                    : "hover:bg-muted/40 border border-transparent"
                  }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b ${item.color}`} />
                )}

                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? `${item.activeBg}`
                    : "bg-muted/30 group-hover:bg-muted/50"
                }`}>
                  <item.icon className={`w-[18px] h-[18px] transition-colors duration-200 ${
                    isActive ? item.iconColor : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                </div>

                <span className={`flex-1 text-sm tracking-wide ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                }`}>
                  {item.label}
                </span>

                <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
                  isActive ? "text-muted-foreground opacity-100" : "opacity-0 group-hover:opacity-60 text-muted-foreground"
                }`} />
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="px-3 pb-6 mt-auto">
          <div className="mx-4 mb-3 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          <button
            onClick={handleSignOut}
            className="group flex items-center gap-3.5 px-4 py-3 rounded-xl w-full text-left transition-all duration-200 hover:bg-destructive/8 border border-transparent hover:border-destructive/15"
          >
            <div className="w-9 h-9 rounded-lg bg-destructive/8 flex items-center justify-center group-hover:bg-destructive/15 transition-colors">
              <LogOut className="w-[18px] h-[18px] text-destructive/70 group-hover:text-destructive transition-colors" />
            </div>
            <span className="text-sm font-rajdhani font-medium text-destructive/70 group-hover:text-destructive tracking-wide transition-colors">
              Sign Out
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
