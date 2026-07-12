import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Menu, Hash, Shield, Bell } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAdminPendingCounts } from "@/hooks/useAdminPendingCounts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const { profile } = useProfile();
  const { data: counts } = useAdminPendingCounts();
  const navigate = useNavigate();

  const urgentItems = [
    { label: "Topups", count: counts?.pendingTopups ?? 0, path: "/admin/topups", color: "text-neon-green" },
    { label: "Withdrawals", count: counts?.pendingWithdrawals ?? 0, path: "/admin/withdrawals", color: "text-neon-orange" },
    { label: "Tickets", count: counts?.openTickets ?? 0, path: "/admin/support", color: "text-neon-cyan" },
    { label: "Alerts", count: counts?.openDetections ?? 0, path: "/admin/detection", color: "text-neon-gold" },
  ].filter((i) => i.count > 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(260,25%,3%)]">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-border/40 bg-card/60 backdrop-blur-2xl">
            <div className="h-14 flex items-center justify-between px-4 sm:px-6 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="lg:hidden p-2 rounded-xl hover:bg-primary/10 transition-colors shrink-0">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                
                <div className="flex items-center gap-3 min-w-0">
                  <div className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-neon-purple/20 items-center justify-center border border-primary/20 shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-orbitron font-bold text-foreground tracking-wide truncate">
                      {title}
                    </h1>
                    {description && (
                      <p className="text-[11px] text-muted-foreground font-rajdhani truncate">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {profile?.uid && (
                  <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/20">
                    <Hash className="w-3 h-3 text-primary/70" />
                    <span className="text-[11px] font-mono font-semibold text-primary">
                      {profile.uid}
                    </span>
                  </div>
                )}
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neon-green/8 border border-neon-green/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  <span className="text-[11px] font-semibold text-neon-green">Online</span>
                </div>
              </div>
            </div>

            {/* Pending actions bar */}
            {urgentItems.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 sm:px-6 pb-2.5 overflow-x-auto scrollbar-hide">
                <Bell className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                {urgentItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-rajdhani font-bold uppercase tracking-wider transition-all hover:scale-105 shrink-0",
                      "bg-destructive/8 border border-destructive/20 text-destructive/80 hover:bg-destructive/15"
                    )}
                  >
                    <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center text-[9px] font-bold">
                      {item.count}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-auto relative">
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }}
            />
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
