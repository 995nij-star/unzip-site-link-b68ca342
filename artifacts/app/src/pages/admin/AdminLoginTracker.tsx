import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Loader2, Monitor, Smartphone, Globe, Clock, MapPin,
  Wifi, Shield, User, CalendarDays, Hash, LogIn, Activity,
} from "lucide-react";

interface LoginRecord {
  id: string;
  browser: string | null;
  os: string | null;
  device_name: string | null;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  logged_in_at: string;
  is_trusted: boolean;
  device_id: string | null;
}

interface UserProfile {
  username: string | null;
  uid: string | null;
  avatar_url: string | null;
  email: string | null;
  user_id: string;
  created_at: string;
}

interface SearchResult {
  profile: UserProfile;
  loginHistory: LoginRecord[];
  totalLogins: number;
  uniqueIPs: number;
  uniqueDevices: number;
  firstLogin: string | null;
  lastLogin: string | null;
  topLocations: { location: string; count: number }[];
  loginsByDay: { date: string; count: number }[];
}

export default function AdminLoginTracker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const q = searchQuery.trim();

      // Search by UID, email, username, or user_id
      let profileQuery = supabase.from("profiles").select("*");

      if (q.includes("@")) {
        profileQuery = profileQuery.eq("email", q);
      } else if (q.length === 10 && /^\d+$/.test(q)) {
        profileQuery = profileQuery.eq("uid", q);
      } else if (q.length === 36 && q.includes("-")) {
        profileQuery = profileQuery.eq("user_id", q);
      } else {
        profileQuery = profileQuery.ilike("username", `%${q}%`);
      }

      const { data: profiles } = await profileQuery.limit(1);

      if (!profiles || profiles.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const profile = profiles[0];

      // Fetch all login history for this user
      const { data: loginHistory } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("logged_in_at", { ascending: false })
        .limit(500);

      const records = (loginHistory || []) as unknown as LoginRecord[];
      const totalLogins = records.length;

      // Unique IPs
      const uniqueIPs = new Set(records.map((r) => r.ip_address).filter(Boolean)).size;

      // Unique devices
      const uniqueDevices = new Set(
        records.map((r) => r.device_id || r.device_name).filter(Boolean)
      ).size;

      const firstLogin = records.length > 0 ? records[records.length - 1].logged_in_at : null;
      const lastLogin = records.length > 0 ? records[0].logged_in_at : null;

      // Top locations
      const locationMap = new Map<string, number>();
      records.forEach((r) => {
        const loc = [r.city, r.country].filter(Boolean).join(", ") || "Unknown";
        locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
      });
      const topLocations = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Logins by day (last 30 days)
      const dayMap = new Map<string, number>();
      records.forEach((r) => {
        const day = format(new Date(r.logged_in_at), "yyyy-MM-dd");
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });
      const loginsByDay = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);

      setResult({
        profile: {
          username: profile.username,
          uid: profile.uid,
          avatar_url: profile.avatar_url,
          email: profile.email,
          user_id: profile.user_id,
          created_at: profile.created_at,
        },
        loginHistory: records,
        totalLogins,
        uniqueIPs,
        uniqueDevices,
        firstLogin,
        lastLogin,
        topLocations,
        loginsByDay,
      });
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (os: string | null) => {
    if (!os) return Monitor;
    const lower = os.toLowerCase();
    if (lower.includes("iphone") || lower.includes("android") || lower.includes("ipad"))
      return Smartphone;
    return Monitor;
  };

  // Estimate session duration between consecutive logins (rough heuristic)
  const estimateSessionDuration = (index: number, records: LoginRecord[]): string => {
    if (index === 0) return "Active";
    // No reliable way without logout tracking, show time since login
    return formatDistanceToNow(new Date(records[index].logged_in_at), { addSuffix: false });
  };

  return (
    <AdminLayout title="Login Tracker" description="Search users and analyze their login activity">
      {/* Search */}
      <div className="flex gap-3 mb-6">
        <CyberInput
          placeholder="Search by UID, email, username, or UUID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          icon={<Search className="w-4 h-4" />}
          className="flex-1"
        />
        <CyberButton onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </CyberButton>
      </div>

      {/* Not Found */}
      {notFound && (
        <div className="text-center py-16">
          <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-rajdhani text-lg">No user found</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl p-5">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-primary/30">
                <AvatarImage src={result.profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-orbitron">
                  {result.profile.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-orbitron font-bold text-foreground">
                  {result.profile.username || "Unknown"}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground font-rajdhani">
                  {result.profile.uid && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {result.profile.uid}
                    </span>
                  )}
                  {result.profile.email && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      @ {result.profile.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Joined {format(new Date(result.profile.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Logins", value: result.totalLogins, icon: LogIn, color: "text-neon-blue" },
              { label: "Unique IPs", value: result.uniqueIPs, icon: Globe, color: "text-neon-cyan" },
              { label: "Unique Devices", value: result.uniqueDevices, icon: Monitor, color: "text-neon-purple" },
              {
                label: "Last Active",
                value: result.lastLogin
                  ? formatDistanceToNow(new Date(result.lastLogin), { addSuffix: true })
                  : "Never",
                icon: Activity,
                color: "text-neon-green",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 backdrop-blur-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-orbitron font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Top Locations */}
          {result.topLocations.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-xl p-4">
              <h4 className="text-xs font-rajdhani font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-neon-orange" /> Top Locations
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.topLocations.map((loc) => (
                  <Badge
                    key={loc.location}
                    variant="secondary"
                    className="font-rajdhani text-xs px-2.5 py-1"
                  >
                    {loc.location} <span className="ml-1 text-primary font-bold">×{loc.count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Logins by Day */}
          {result.loginsByDay.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-xl p-4">
              <h4 className="text-xs font-rajdhani font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-neon-blue" /> Login Activity (by day)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.loginsByDay.map((d) => (
                  <div
                    key={d.date}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/40 border border-border/30 text-xs font-rajdhani"
                  >
                    <span className="text-muted-foreground">{format(new Date(d.date), "MMM d")}</span>
                    <span className="font-bold text-primary">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Login History Table */}
          <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h4 className="text-xs font-rajdhani font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-neon-purple" /> Full Login History ({result.totalLogins})
              </h4>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-rajdhani">Device</TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">IP Address</TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">Location</TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">Trusted</TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">Date & Time</TableHead>
                    <TableHead className="text-muted-foreground font-rajdhani">Time Ago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.loginHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-rajdhani">
                        No login records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.loginHistory.map((record, idx) => {
                      const DeviceIcon = getDeviceIcon(record.os);
                      const isLatest = idx === 0;
                      return (
                        <TableRow
                          key={record.id}
                          className={`border-border ${isLatest ? "bg-neon-green/[0.03]" : ""}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DeviceIcon className={`w-4 h-4 ${isLatest ? "text-neon-green" : "text-muted-foreground"}`} />
                              <div className="text-sm font-rajdhani">
                                <span className="text-foreground">{record.browser || "Unknown"}</span>
                                <span className="block text-[11px] text-muted-foreground">{record.os || "Unknown OS"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {record.ip_address || "-"}
                          </TableCell>
                          <TableCell className="text-sm font-rajdhani text-muted-foreground">
                            {[record.city, record.country].filter(Boolean).join(", ") || "-"}
                          </TableCell>
                          <TableCell>
                            {record.is_trusted ? (
                              <Badge className="bg-neon-green/15 text-neon-green border-neon-green/25 text-[9px] font-rajdhani">
                                Trusted
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] font-rajdhani">
                                New
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-rajdhani text-muted-foreground whitespace-nowrap">
                            {format(new Date(record.logged_in_at), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm font-rajdhani text-muted-foreground">
                            {formatDistanceToNow(new Date(record.logged_in_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
