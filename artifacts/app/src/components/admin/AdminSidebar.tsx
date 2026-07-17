import { useState, useMemo } from "react";
import { 
  LayoutDashboard, Users, Trophy, Wallet, ArrowLeft, Shield, ClipboardList,
  MessageSquare, Settings, Megaphone, IndianRupee, Banknote, Gift, Bot,
  AlertTriangle, UserPlus, Search, Power, Activity, Zap, Crown, Package, History, ScanSearch, Fingerprint, Film, Pencil, BarChart3, BellRing, Wrench, ShieldCheck, ShieldQuestion, MapPin, KeyRound, CreditCard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAISettings } from "@/hooks/useAISettings";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminPendingCounts } from "@/hooks/useAdminPendingCounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
  badge?: string;
  color?: string;
  pendingKey?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, color: "text-neon-blue" },
      { title: "User Lookup", url: "/admin/user-lookup", icon: Search, color: "text-neon-cyan" },
      { title: "Login Tracker", url: "/admin/login-tracker", icon: History, color: "text-neon-orange" },
      { title: "Live Monitor", url: "/admin/live-monitor", icon: Activity, adminOnly: true, badge: "LIVE", color: "text-destructive" },
      { title: "Arjun Era Detection", url: "/admin/detection", icon: Zap, adminOnly: true, badge: "AI", color: "text-neon-gold", pendingKey: "openDetections" },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3, adminOnly: true, color: "text-neon-green" },
    ],
  },
  {
    label: "Users & Social",
    items: [
      { title: "Users", url: "/admin/users", icon: Users, color: "text-neon-purple" },
      { title: "Mod Applications", url: "/admin/mod-applications", icon: UserPlus, color: "text-neon-cyan", pendingKey: "pendingModApps" },
      { title: "Ban Audit Log", url: "/admin/ban-audit", icon: ClipboardList, color: "text-neon-orange" },
      { title: "Suspicious Activity", url: "/admin/suspicious-activity", icon: AlertTriangle, adminOnly: true, color: "text-destructive", pendingKey: "suspiciousActivities" },
      { title: "Fraud Monitor", url: "/admin/fraud-monitor", icon: Fingerprint, adminOnly: true, color: "text-neon-orange" },
      { title: "Test Zone (Bot Check)", url: "/admin/test-zone", icon: ShieldQuestion, adminOnly: true, badge: "AI", color: "text-neon-purple" },
      { title: "Locked Accounts", url: "/admin/locked-accounts", icon: Shield, adminOnly: true, color: "text-destructive" },
      { title: "User Locations", url: "/admin/user-locations", icon: MapPin, color: "text-neon-cyan" },
    ],
  },
  {
    label: "Tournaments",
    items: [
      { title: "Tournaments", url: "/admin/tournaments", icon: Trophy, color: "text-neon-gold" },
      { title: "Announcements", url: "/admin/announcements", icon: Megaphone, color: "text-neon-pink" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Wallets", url: "/admin/wallets", icon: Wallet, color: "text-neon-green" },
      { title: "Topup Requests", url: "/admin/topups", icon: IndianRupee, color: "text-neon-green", pendingKey: "pendingTopups" },
      { title: "Withdrawals", url: "/admin/withdrawals", icon: Banknote, color: "text-neon-orange", pendingKey: "pendingWithdrawals" },
      { title: "Gift Cards", url: "/admin/gift-codes", icon: Gift, adminOnly: true, color: "text-neon-pink" },
      { title: "KYC Verifications", url: "/admin/kyc", icon: ShieldCheck, color: "text-neon-green" },
      { title: "Money Transfers", url: "/admin/money-transfers", icon: Banknote, color: "text-neon-cyan" },
      { title: "Payment Methods", url: "/admin/payment-methods", icon: CreditCard, color: "text-neon-purple", adminOnly: true },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Support Tickets", url: "/admin/support", icon: MessageSquare, color: "text-neon-cyan", pendingKey: "openTickets" },
      { title: "Chat Monitor", url: "/admin/chats", icon: MessageSquare, color: "text-neon-blue" },
      { title: "AI Chat Logs", url: "/admin/ai-chats", icon: Bot, color: "text-neon-purple" },
      { title: "Clips Manager", url: "/admin/clips", icon: Film, color: "text-neon-pink" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "System Controls", url: "/admin/system-controls", icon: Power, adminOnly: true, color: "text-destructive" },
      { title: "Notification Manager", url: "/admin/notification-manager", icon: BellRing, adminOnly: true, color: "text-neon-pink" },
      { title: "Maintenance Mode", url: "/admin/maintenance", icon: Wrench, adminOnly: true, color: "text-neon-orange" },
      { title: "Roles & Permissions", url: "/admin/roles", icon: ShieldCheck, adminOnly: true, color: "text-neon-purple" },
      { title: "Automation Rules", url: "/admin/automation-rules", icon: Zap, adminOnly: true, color: "text-neon-gold" },
      { title: "APK Manager", url: "/admin/apk-manager", icon: Package, adminOnly: true, color: "text-neon-green" },
      { title: "Site Scanner", url: "/admin/site-scanner", icon: ScanSearch, adminOnly: true, color: "text-neon-cyan" },
      { title: "Content Editor", url: "/admin/content-editor", icon: Pencil, adminOnly: true, color: "text-neon-green" },
      { title: "AI Assistant", url: "/admin/ai", icon: Bot, adminOnly: true, color: "text-neon-cyan" },
      { title: "Developer API Keys", url: "/admin/developer-api", icon: KeyRound, adminOnly: true, color: "text-neon-cyan" },
      { title: "Settings", url: "/admin/settings", icon: Settings, adminOnly: true, color: "text-muted-foreground" },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { aiSettings } = useAISettings();
  const { isAdmin } = useAdmin();
  const { data: pendingCounts } = useAdminPendingCounts();
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => {
    if (path === "/admin") return currentPath === "/admin";
    return currentPath.startsWith(path);
  };

  const getPendingCount = (key?: string): number => {
    if (!key || !pendingCounts) return 0;
    return (pendingCounts as any)[key] ?? 0;
  };

  const totalPending = pendingCounts
    ? pendingCounts.pendingTopups + pendingCounts.pendingWithdrawals + pendingCounts.openTickets + pendingCounts.pendingModApps
    : 0;

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return menuGroups;
    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.title.toLowerCase().includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  return (
    <Sidebar className="border-r border-border/40 bg-[hsl(260,25%,5%)]">
      <SidebarHeader className="p-4 border-b border-border/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-primary/30">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-[hsl(260,25%,5%)]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-orbitron font-bold text-foreground tracking-wider">
                ADMIN
              </h1>
              {totalPending > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive min-w-[18px] text-center animate-pulse">
                  {totalPending}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-widest">
              Control Center
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-white/[0.03] border-border/30 rounded-lg font-rajdhani placeholder:text-muted-foreground/40 focus-visible:ring-primary/30"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {filteredGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.url === "/admin/ai" && !aiSettings.enabled) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="py-2">
              <SidebarGroupLabel className="text-muted-foreground/50 font-rajdhani uppercase text-[10px] tracking-[0.2em] font-bold px-3 mb-1">
                {group.label}
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const active = isActive(item.url);
                    const count = getPendingCount(item.pendingKey);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.url} 
                            end={item.url === "/admin"}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
                              active 
                                ? "bg-primary/12 text-foreground border border-primary/25 shadow-sm shadow-primary/10" 
                                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent"
                            )}
                            activeClassName=""
                          >
                            {active && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                            )}
                            <item.icon className={cn("w-4 h-4 transition-colors shrink-0", active ? item.color : "text-muted-foreground group-hover:" + (item.color || "text-foreground"))} />
                            <span className="font-rajdhani font-medium text-sm flex-1 truncate">{item.title}</span>
                            {count > 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive min-w-[18px] text-center">
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                            {item.badge && count === 0 && (
                              <span className={cn(
                                "px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0",
                                item.badge === "LIVE" 
                                  ? "bg-destructive/20 text-destructive animate-pulse" 
                                  : item.badge === "AI"
                                  ? "bg-neon-gold/20 text-neon-gold"
                                  : "bg-primary/20 text-primary"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {filteredGroups.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <Search className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground/50 font-rajdhani">No results for "{searchQuery}"</p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl border-border/50 bg-white/[0.02] hover:bg-white/[0.05] gap-2 font-rajdhani"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
