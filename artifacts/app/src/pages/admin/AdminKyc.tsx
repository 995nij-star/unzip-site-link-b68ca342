import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

type Kyc = any;

export default function AdminKyc() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Kyc[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("kyc_verifications")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(500);
    setRows((data as any[]) || []);
    const ids = (data || []).map((r: any) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, username, uid, email, avatar_url")
        .in("user_id", ids);
      setProfiles(Object.fromEntries((profs || []).map((p: any) => [p.user_id, p])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getSignedUrl = async (path: string) => {
    if (signed[path]) return signed[path];
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 600);
    if (data?.signedUrl) {
      setSigned((s) => ({ ...s, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  const decide = async (row: Kyc, status: "approved" | "rejected"): Promise<void> => {
    setActing(row.id);
    const update: any = {
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (status === "rejected") {
      update.rejection_reason = rejectionReasons[row.id]?.trim() || "Documents unclear. Please re-submit.";
    } else {
      update.rejection_reason = null;
    }
    const { error } = await supabase.from("kyc_verifications").update(update).eq("id", row.id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`KYC ${status}`);
    load();
  };

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <AdminLayout title="KYC Verifications">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> KYC Verifications
          </h1>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({rows.filter((r) => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {filtered.map((row) => {
            const p = profiles[row.user_id];
            return (
              <Card key={row.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                        {p?.avatar_url && <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{p?.username || "Unknown"} {p?.uid && <span className="text-xs text-muted-foreground">#{p.uid}</span>}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p?.email} · submitted {formatDistanceToNow(new Date(row.submitted_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>
                      {row.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{row.full_name}</span></div>
                    <div><span className="text-muted-foreground">Document:</span> <Badge variant="outline">{row.document_type}</Badge></div>
                    {row.document_number && <div className="col-span-2"><span className="text-muted-foreground">Number:</span> <span className="font-mono">{row.document_number}</span></div>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <KycImage path={row.selfie_url} label="Selfie" onLoad={getSignedUrl} url={signed[row.selfie_url]} />
                    <KycImage path={row.document_url} label="Document" onLoad={getSignedUrl} url={signed[row.document_url]} />
                  </div>

                  {row.status === "pending" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        placeholder="Optional rejection reason..."
                        value={rejectionReasons[row.id] || ""}
                        onChange={(e) => setRejectionReasons((r) => ({ ...r, [row.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => decide(row, "approved")} disabled={acting === row.id} className="flex-1 bg-green-600 hover:bg-green-700">
                          {acting === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</>}
                        </Button>
                        <Button onClick={() => decide(row, "rejected")} disabled={acting === row.id} variant="destructive" className="flex-1">
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {row.status === "rejected" && row.rejection_reason && (
                    <div className="text-sm text-destructive">Reason: {row.rejection_reason}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!loading && filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No submissions in this tab.</CardContent></Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function KycImage({ path, label, onLoad, url }: { path: string; label: string; onLoad: (p: string) => Promise<any>; url?: string }) {
  useEffect(() => { if (!url) onLoad(path); }, [path]);
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      {url ? (
        path.endsWith(".pdf") ? (
          <a href={url} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-primary border rounded-lg p-3 hover:bg-muted">
            View PDF <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noopener">
            <img src={url} alt={label} className="w-full rounded-lg border aspect-square object-cover" />
          </a>
        )
      ) : (
        <div className="aspect-square rounded-lg bg-muted animate-pulse" />
      )}
    </div>
  );
}
