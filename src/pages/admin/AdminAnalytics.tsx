import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, TrendingUp, Trophy, Wallet, Calendar } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--neon-cyan, 180 100% 50%))", "hsl(var(--neon-green, 120 100% 50%))", "hsl(var(--neon-orange, 30 100% 50%))", "hsl(var(--neon-pink, 330 100% 50%))"];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [signupData, setSignupData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [gameDistribution, setGameDistribution] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalRevenue: 0, tournamentsThisMonth: 0 });

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const since = subDays(new Date(), days).toISOString();
    const dateRange = eachDayOfInterval({ start: subDays(new Date(), days), end: new Date() });

    // Fetch signups
    const { data: profiles } = await supabase.from("profiles").select("created_at").gte("created_at", since);
    const signupMap: Record<string, number> = {};
    dateRange.forEach(d => { signupMap[format(d, "MMM dd")] = 0; });
    profiles?.forEach(p => {
      const key = format(new Date(p.created_at), "MMM dd");
      if (signupMap[key] !== undefined) signupMap[key]++;
    });
    setSignupData(Object.entries(signupMap).map(([date, count]) => ({ date, signups: count })));

    // Fetch revenue (entry fees)
    const { data: transactions } = await supabase.from("wallet_transactions").select("amount, created_at, type").gte("created_at", since).eq("type", "entry_fee");
    const revMap: Record<string, number> = {};
    dateRange.forEach(d => { revMap[format(d, "MMM dd")] = 0; });
    transactions?.forEach(t => {
      const key = format(new Date(t.created_at), "MMM dd");
      if (revMap[key] !== undefined) revMap[key] += Math.abs(Number(t.amount));
    });
    setRevenueData(Object.entries(revMap).map(([date, revenue]) => ({ date, revenue })));

    // Game distribution
    const { data: tournaments } = await supabase.from("tournaments").select("game");
    const gameMap: Record<string, number> = {};
    tournaments?.forEach(t => { gameMap[t.game] = (gameMap[t.game] || 0) + 1; });
    setGameDistribution(Object.entries(gameMap).map(([name, value]) => ({ name, value })));

    // Stats - use count queries (no row limit issues)
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const todayStart = startOfDay(new Date()).toISOString();
    const { count: activeToday } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", todayStart);
    const totalRevenue = transactions?.reduce((s, t) => s + Math.abs(Number(t.amount)), 0) || 0;
    const { count: tournamentsThisMonth } = await supabase.from("tournaments").select("*", { count: "exact", head: true }).gte("created_at", since);
    const { count: signupCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since);

    setStats({
      totalUsers: totalUsers || 0,
      activeToday: activeToday || 0,
      totalRevenue,
      tournamentsThisMonth: tournamentsThisMonth || 0,
    });
    setLoading(false);
  };

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Active Today", value: stats.activeToday, icon: TrendingUp, color: "text-neon-green" },
    { label: `Revenue (${range})`, value: `₹${stats.totalRevenue.toLocaleString()}`, icon: Wallet, color: "text-neon-orange" },
    { label: `Tournaments (${range})`, value: stats.tournamentsThisMonth, icon: Trophy, color: "text-neon-cyan" },
  ];

  if (loading) {
    return (
      <AdminLayout title="User Analytics" description="Loading analytics...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Analytics" description="Platform growth, revenue, and engagement metrics">
      {/* Range selector */}
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 bg-card/60 border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-orbitron font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground font-rajdhani">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5 bg-card/60 border-border/50">
          <h3 className="font-orbitron text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> User Signups
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={signupData}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#signupGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-card/60 border-border/50">
          <h3 className="font-orbitron text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-neon-orange" /> Revenue (Entry Fees)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Game distribution */}
      {gameDistribution.length > 0 && (
        <Card className="p-5 bg-card/60 border-border/50">
          <h3 className="font-orbitron text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-neon-cyan" /> Tournament Game Distribution
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={gameDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {gameDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </AdminLayout>
  );
}
