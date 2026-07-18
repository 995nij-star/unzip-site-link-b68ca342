import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { useAdminStats, useAdmin } from "@/hooks/useAdmin";
import { useAdminPendingCounts } from "@/hooks/useAdminPendingCounts";
import { AdminBootstrap } from "@/components/admin/AdminBootstrap";
import { Users, Trophy, Wallet, TrendingUp, Loader2, Activity, ArrowUpRight, IndianRupee, Banknote, MessageSquare, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useAdminStats();
  const { data: pendingCounts } = useAdminPendingCounts();
  const { isAdmin, isLoading: roleLoading } = useAdmin();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard" description="Loading statistics...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-rajdhani">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard" description="Error loading data">
        <div className="text-center text-destructive py-12 space-y-2">
          <p className="font-semibold">Failed to load dashboard statistics.</p>
          <p className="text-sm text-muted-foreground">Please try again.</p>
        </div>
      </AdminLayout>
    );
  }

  const actionCards = [
    { label: "Pending Topups", count: pendingCounts?.pendingTopups ?? 0, icon: IndianRupee, path: "/admin/topups", color: "from-neon-green/10 to-neon-green/5", iconColor: "text-neon-green", borderColor: "border-neon-green/20" },
    { label: "Pending Withdrawals", count: pendingCounts?.pendingWithdrawals ?? 0, icon: Banknote, path: "/admin/withdrawals", color: "from-neon-orange/10 to-neon-orange/5", iconColor: "text-neon-orange", borderColor: "border-neon-orange/20" },
    { label: "Open Tickets", count: pendingCounts?.openTickets ?? 0, icon: MessageSquare, path: "/admin/support", color: "from-neon-cyan/10 to-neon-cyan/5", iconColor: "text-neon-cyan", borderColor: "border-neon-cyan/20" },
    { label: "Suspicious Activity", count: pendingCounts?.suspiciousActivities ?? 0, icon: AlertTriangle, path: "/admin/suspicious-activity", color: "from-destructive/10 to-destructive/5", iconColor: "text-destructive", borderColor: "border-destructive/20" },
  ];

  return (
    <AdminLayout title="Dashboard" description="Platform overview & analytics">
      {/* Admin role bootstrap — shown when service-role row is missing */}
      {!roleLoading && !isAdmin && <AdminBootstrap />}

      {/* Welcome Banner */}
      <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 via-neon-purple/5 to-neon-pink/5 p-5 sm:p-6 mb-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-rajdhani text-primary uppercase tracking-widest font-bold">Live Stats</span>
          </div>
          <h2 className="text-lg sm:text-xl font-orbitron font-bold text-foreground">
            Welcome back, Admin
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-rajdhani mt-1">
            Here's what's happening on your platform today.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="w-5 h-5 text-neon-purple" />}
        />
        <StatCard
          title="Active Tournaments"
          value={stats?.activeTournaments ?? 0}
          icon={<Trophy className="w-5 h-5 text-neon-gold" />}
        />
        <StatCard
          title="Total Prize Pool"
          value={`₹${(stats?.totalPrizePool ?? 0).toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5 text-neon-green" />}
        />
        <StatCard
          title="Platform Balance"
          value={`₹${(stats?.totalBalance ?? 0).toLocaleString()}`}
          icon={<Wallet className="w-5 h-5 text-neon-cyan" />}
        />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {actionCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.path)}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
              "bg-gradient-to-br", card.color, card.borderColor
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={cn("w-4 h-4", card.iconColor)} />
              {card.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-destructive/20 text-destructive animate-pulse">
                  {card.count}
                </span>
              )}
            </div>
            <p className="text-xl font-orbitron font-bold text-foreground">{card.count}</p>
            <p className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-wider mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Two-column detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Platform Metrics */}
        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
            <h3 className="font-orbitron font-bold text-foreground text-sm tracking-wide">
              Platform Metrics
            </h3>
            <span className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-widest">Overview</span>
          </div>
          <div className="p-4 space-y-0.5">
            {[
              { label: "Total Tournaments", value: stats?.totalTournaments ?? 0, color: "" },
              { label: "Entry Fee Revenue", value: `₹${(stats?.entryFeeRevenue ?? 0).toLocaleString()}`, color: "text-neon-green" },
              { label: "Avg Wallet Balance", value: `₹${stats?.totalUsers ? Math.round((stats.totalBalance ?? 0) / stats.totalUsers).toLocaleString() : 0}`, color: "" },
              { label: "Mod Applications", value: pendingCounts?.pendingModApps ?? 0, color: pendingCounts?.pendingModApps ? "text-neon-orange" : "" },
            ].map((metric, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
                <span className="text-sm text-muted-foreground font-rajdhani group-hover:text-foreground transition-colors">{metric.label}</span>
                <span className={cn("font-orbitron text-sm font-semibold", metric.color || "text-foreground")}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
            <h3 className="font-orbitron font-bold text-foreground text-sm tracking-wide">
              Recent Transactions
            </h3>
            <span className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-widest">Latest</span>
          </div>
          <div className="p-3">
            <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
              {stats?.recentTransactions?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 font-rajdhani text-sm">
                  No transactions yet
                </p>
              ) : (
                stats?.recentTransactions?.map((tx: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        Number(tx.amount) >= 0 ? "bg-neon-green/10" : "bg-destructive/10"
                      )}>
                        <ArrowUpRight className={cn(
                          "w-4 h-4",
                          Number(tx.amount) >= 0 ? "text-neon-green" : "text-destructive rotate-180"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-rajdhani capitalize font-medium truncate">
                          {String(tx.type).replace('_', ' ')}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {format(new Date(String(tx.created_at)), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-orbitron text-sm font-bold shrink-0",
                      Number(tx.amount) >= 0 ? 'text-neon-green' : 'text-destructive'
                    )}>
                      {Number(tx.amount) >= 0 ? '+' : ''}₹{Math.abs(Number(tx.amount))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
