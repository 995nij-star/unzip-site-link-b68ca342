import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CyberButton } from "@/components/ui/cyber-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Trophy, AlertTriangle, RefreshCw, Loader2,
  Globe, Shield,
} from "lucide-react";
import { format } from "date-fns";

interface PlatformStats {
  totalUsers: number;
  onlineUsers: number;
  activeTournaments: number;
  recentTransactions: any[];
  recentLogins: any[];
  suspiciousAlerts: any[];
  duplicateIPs: any[];
  excessiveRedeems: any[];
}

export default function AdminLiveMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      usersRes, onlineRes, tournamentsRes, transactionsRes,
      loginsRes, suspiciousRes, redeemRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      (supabase as any).from("profiles").select("id", { count: "exact", head: true }).gte("last_seen", fiveMinAgo),
      supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "live"),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("login_history").select("*").order("logged_in_at", { ascending: false }).limit(20),
      (supabase as any).from("suspicious_activities").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      supabase.from("redeem_attempts").select("user_id, attempted_code, created_at").gte("created_at", oneDayAgo).order("created_at", { ascending: false }),
    ]);

    // Detect duplicate IPs from login history
    const { data: ipData } = await supabase.from("login_history").select("ip_address, user_id").gte("logged_in_at", oneDayAgo);
    const ipMap = new Map<string, Set<string>>();
    ipData?.forEach((row: any) => {
      if (!row.ip_address) return;
      if (!ipMap.has(row.ip_address)) ipMap.set(row.ip_address, new Set());
      ipMap.get(row.ip_address)!.add(row.user_id);
    });
    const duplicateIPs = Array.from(ipMap.entries())
      .filter(([, users]) => users.size > 1)
      .map(([ip, users]) => ({ ip, userCount: users.size, userIds: Array.from(users) }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10);

    // Detect excessive redeem attempts
    const redeemMap = new Map<string, number>();
    redeemRes.data?.forEach((r: any) => {
      redeemMap.set(r.user_id, (redeemMap.get(r.user_id) || 0) + 1);
    });
    const excessiveRedeems = Array.from(redeemMap.entries())
      .filter(([, count]) => count >= 5)
      .map(([userId, count]) => ({ userId, attempts: count }))
      .sort((a, b) => b.attempts - a.attempts);

    setStats({
      totalUsers: usersRes.count || 0,
      onlineUsers: onlineRes.count || 0,
      activeTournaments: tournamentsRes.count || 0,
      recentTransactions: transactionsRes.data || [],
      recentLogins: loginsRes.data || [],
      suspiciousAlerts: suspiciousRes.data || [],
      duplicateIPs,
      excessiveRedeems,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <AdminLayout title="Live Monitor" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Live Activity Monitor" description="Real-time platform monitoring and fraud detection">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-neon-green/10 border border-neon-green/30 text-center">
          <Users className="w-6 h-6 text-neon-green mx-auto mb-1" />
          <p className="text-2xl font-orbitron font-bold text-foreground">{stats?.onlineUsers}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Online Now</p>
        </div>
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
          <Users className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-orbitron font-bold text-foreground">{stats?.totalUsers}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Total Users</p>
        </div>
        <div className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-center">
          <Trophy className="w-6 h-6 text-neon-cyan mx-auto mb-1" />
          <p className="text-2xl font-orbitron font-bold text-foreground">{stats?.activeTournaments}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Live Tournaments</p>
        </div>
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
          <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-1" />
          <p className="text-2xl font-orbitron font-bold text-foreground">{stats?.suspiciousAlerts.length}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Pending Alerts</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <CyberButton variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </CyberButton>
      </div>

      <Tabs defaultValue="fraud" className="space-y-4">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="fraud" className="font-rajdhani">🔍 Fraud Detection</TabsTrigger>
          <TabsTrigger value="transactions" className="font-rajdhani">💰 Transactions</TabsTrigger>
          <TabsTrigger value="logins" className="font-rajdhani">🔐 Logins</TabsTrigger>
        </TabsList>

        <TabsContent value="fraud" className="space-y-6">
          {/* Duplicate IPs */}
          <div className="bg-gradient-card rounded-xl border border-border p-5">
            <h3 className="font-orbitron font-bold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-neon-orange" /> Multiple Accounts from Same IP (24h)
            </h3>
            {stats?.duplicateIPs.length === 0 ? (
              <p className="text-muted-foreground font-rajdhani text-sm">No duplicate IPs detected</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-rajdhani">IP Address</TableHead>
                    <TableHead className="font-rajdhani">Users</TableHead>
                    <TableHead className="font-rajdhani">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.duplicateIPs.map((item, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="font-mono text-sm">{item.ip}</TableCell>
                      <TableCell className="font-rajdhani">{item.userCount} accounts</TableCell>
                      <TableCell>
                        <Badge variant={item.userCount >= 5 ? "destructive" : "secondary"} className="font-rajdhani">
                          {item.userCount >= 5 ? "High" : item.userCount >= 3 ? "Medium" : "Low"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Excessive Redeems */}
          <div className="bg-gradient-card rounded-xl border border-border p-5">
            <h3 className="font-orbitron font-bold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Excessive Redeem Attempts (24h)
            </h3>
            {stats?.excessiveRedeems.length === 0 ? (
              <p className="text-muted-foreground font-rajdhani text-sm">No excessive attempts detected</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-rajdhani">User ID</TableHead>
                    <TableHead className="font-rajdhani">Attempts</TableHead>
                    <TableHead className="font-rajdhani">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.excessiveRedeems.map((item, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="font-mono text-xs">{item.userId.slice(0, 8)}...</TableCell>
                      <TableCell className="font-rajdhani">{item.attempts}</TableCell>
                      <TableCell>
                        <Badge variant={item.attempts >= 10 ? "destructive" : "secondary"} className="font-rajdhani">
                          {item.attempts >= 10 ? "High" : "Medium"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pending Suspicious Alerts */}
          <div className="bg-gradient-card rounded-xl border border-border p-5">
            <h3 className="font-orbitron font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-neon-pink" /> Pending Suspicious Alerts
            </h3>
            {stats?.suspiciousAlerts.length === 0 ? (
              <p className="text-muted-foreground font-rajdhani text-sm">No pending alerts</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-rajdhani">Type</TableHead>
                    <TableHead className="font-rajdhani">Description</TableHead>
                    <TableHead className="font-rajdhani">Severity</TableHead>
                    <TableHead className="font-rajdhani">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.suspiciousAlerts.map((alert: any) => (
                    <TableRow key={alert.id} className="border-border">
                      <TableCell className="font-rajdhani capitalize">{alert.activity_type}</TableCell>
                      <TableCell className="font-rajdhani text-sm max-w-xs truncate">{alert.description}</TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === "high" ? "destructive" : "secondary"} className="font-rajdhani">
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-rajdhani text-sm">{format(new Date(alert.created_at), "HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="font-rajdhani">User</TableHead>
                  <TableHead className="font-rajdhani">Type</TableHead>
                  <TableHead className="font-rajdhani">Amount</TableHead>
                  <TableHead className="font-rajdhani">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentTransactions.map((tx: any) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="font-rajdhani">{tx.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-rajdhani capitalize">{tx.type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className={`font-rajdhani font-semibold ${Number(tx.amount) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                      {Number(tx.amount) >= 0 ? "+" : ""}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-rajdhani text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), "HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="logins">
          <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="font-rajdhani">User</TableHead>
                  <TableHead className="font-rajdhani">IP</TableHead>
                  <TableHead className="font-rajdhani">Browser / OS</TableHead>
                  <TableHead className="font-rajdhani">Location</TableHead>
                  <TableHead className="font-rajdhani">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentLogins.map((login: any) => (
                  <TableRow key={login.id} className="border-border">
                    <TableCell className="font-rajdhani">{login.user_id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{login.ip_address || "—"}</TableCell>
                    <TableCell className="font-rajdhani text-sm">{login.browser || "—"} / {login.os || "—"}</TableCell>
                    <TableCell className="font-rajdhani text-sm">{[login.city, login.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="font-rajdhani text-sm text-muted-foreground">
                      {format(new Date(login.logged_in_at), "HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
