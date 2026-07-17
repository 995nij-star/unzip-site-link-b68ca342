import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, RefreshCw, ExternalLink, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Row = {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  permission_status: string;
  last_updated_at: string;
  profile?: { username: string | null; uid: string | null; email: string | null; avatar_url: string | null };
};

export default function AdminUserLocations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: locs } = await supabase
      .from("user_locations")
      .select("*")
      .order("last_updated_at", { ascending: false })
      .limit(500);
    const ids = (locs || []).map((l: any) => l.user_id);
    let profilesById: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, username, uid, email, avatar_url")
        .in("user_id", ids);
      profilesById = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
    }
    setRows(((locs as any[]) || []).map((l) => ({ ...l, profile: profilesById[l.user_id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.profile?.username?.toLowerCase().includes(q) ||
      r.profile?.email?.toLowerCase().includes(q) ||
      r.profile?.uid?.includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.country?.toLowerCase().includes(q)
    );
  });

  const granted = rows.filter((r) => r.permission_status === "granted").length;
  const denied = rows.filter((r) => r.permission_status === "denied").length;

  return (
    <AdminLayout title="User Locations">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <MapPin className="w-7 h-7 text-primary" />
              User Locations
            </h1>
            <p className="text-sm text-muted-foreground">Real-time location data from users who granted permission.</p>
          </div>
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{rows.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Granted</div><div className="text-2xl font-bold text-green-500">{granted}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Denied</div><div className="text-2xl font-bold text-destructive">{denied}</div></CardContent></Card>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username, UID, email, city, country…"
            className="pl-9"
          />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Locations ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-3 hover:bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                    {r.profile?.avatar_url && (
                      <img src={r.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.profile?.username || "Unknown"}</span>
                      {r.profile?.uid && <span className="text-xs text-muted-foreground">#{r.profile.uid}</span>}
                      <Badge
                        variant={r.permission_status === "granted" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {r.permission_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">
                      {r.profile?.email}
                    </div>
                    {r.latitude && r.longitude ? (
                      <div className="mt-2 text-sm">
                        <div className="flex items-center gap-1 text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {[r.city, r.region, r.country].filter(Boolean).join(", ") || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                          {r.accuracy ? ` · ±${Math.round(r.accuracy)}m` : ""}
                          {" · "}
                          updated {formatDistanceToNow(new Date(r.last_updated_at), { addSuffix: true })}
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                        >
                          Open in Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">No coordinates recorded yet.</div>
                    )}
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No locations found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
