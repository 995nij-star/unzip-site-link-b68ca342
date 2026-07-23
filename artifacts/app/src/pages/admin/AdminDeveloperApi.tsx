import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Copy, Search, Ban, KeyRound, Loader2, ShieldAlert, CheckCircle2, Trash2, Power } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ApiKey {
  id: string;
  user_id: string;
  developer_name: string;
  email: string;
  company: string | null;
  application_name: string;
  website_url: string | null;
  purpose: string;
  permissions: string[];
  expected_monthly_requests: number | null;
  api_key: string;
  api_secret_hash: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminDeveloperApi() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [revokeConfirm, setRevokeConfirm] = useState<ApiKey | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("developer_api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load API keys", description: error.message, variant: "destructive" });
    } else {
      setKeys((data ?? []) as unknown as ApiKey[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const handleRevoke = async () => {
    if (!revokeConfirm) return;
    setRevoking(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("developer_api_keys")
      .update({ status: "revoked" })
      .eq("id", revokeConfirm.id);
    if (error) {
      toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("admin_audit_log").insert({
        admin_id: u.user?.id!,
        action: "api_key_revoked_by_admin",
        target_type: "developer_api_key",
        target_id: revokeConfirm.id,
        details: { api_key: revokeConfirm.api_key, user_id: revokeConfirm.user_id },
      });
      toast({ title: "API key revoked" });
      setRevokeConfirm(null);
      load();
    }
    setRevoking(false);
  };

  const setStatus = async (k: ApiKey, newStatus: "active" | "inactive") => {
    setBusyId(k.id);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("developer_api_keys")
      .update({ status: newStatus })
      .eq("id", k.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("admin_audit_log").insert({
        admin_id: u.user?.id!,
        action: newStatus === "active" ? "api_key_activated" : "api_key_deactivated",
        target_type: "developer_api_key",
        target_id: k.id,
        details: { api_key: k.api_key, user_id: k.user_id },
      });
      toast({ title: `API key ${newStatus === "active" ? "activated" : "deactivated"}` });
      load();
    }
    setBusyId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("developer_api_keys")
      .delete()
      .eq("id", deleteConfirm.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("admin_audit_log").insert({
        admin_id: u.user?.id!,
        action: "api_key_deleted",
        target_type: "developer_api_key",
        target_id: deleteConfirm.id,
        details: { api_key: deleteConfirm.api_key, user_id: deleteConfirm.user_id, application_name: deleteConfirm.application_name },
      });
      toast({ title: "API key deleted" });
      setDeleteConfirm(null);
      load();
    }
    setDeleting(false);
  };

  const filtered = keys.filter((k) => {
    if (statusFilter !== "all" && k.status !== statusFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      k.developer_name?.toLowerCase().includes(q) ||
      k.email?.toLowerCase().includes(q) ||
      k.application_name?.toLowerCase().includes(q) ||
      k.api_key?.toLowerCase().includes(q) ||
      k.company?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout title="Developer API Keys" description="View and revoke developer API keys">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-gradient-neon flex items-center gap-2">
              <KeyRound className="w-7 h-7 text-primary" />
              Developer API Keys
            </h1>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">
              View, search, activate, deactivate, or delete developer API keys.
            </p>
          </div>
          <Badge variant="outline" className="font-rajdhani text-sm">
            {keys.length} total · {keys.filter(k => k.status === "active").length} active
          </Badge>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, app, or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground font-rajdhani">
            No API keys found.
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((k) => (
              <Card key={k.id} className="p-5 bg-gradient-card border-border/50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-orbitron font-bold text-lg text-foreground">
                        {k.application_name}
                      </h3>
                      <Badge
                        variant={k.status === "active" ? "default" : "destructive"}
                        className="uppercase text-[10px]"
                      >
                        {k.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-rajdhani">
                      {k.developer_name} · {k.email}
                      {k.company && <span> · {k.company}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground/70 font-rajdhani">
                      Created {new Date(k.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {k.status === "active" && (
                      <Button variant="outline" size="sm" disabled={busyId === k.id}
                        onClick={() => setStatus(k, "inactive")} className="gap-1">
                        <Power className="w-4 h-4" /> Deactivate
                      </Button>
                    )}
                    {k.status === "inactive" && (
                      <Button variant="outline" size="sm" disabled={busyId === k.id}
                        onClick={() => setStatus(k, "active")} className="gap-1 text-neon-green border-neon-green/40">
                        <CheckCircle2 className="w-4 h-4" /> Activate
                      </Button>
                    )}
                    {k.status !== "revoked" && (
                      <Button variant="destructive" size="sm" onClick={() => setRevokeConfirm(k)} className="gap-1">
                        <Ban className="w-4 h-4" /> Revoke
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(k)}
                      className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-rajdhani mb-1">
                      API Key
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-primary break-all flex-1">
                        {k.api_key}
                      </code>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                        onClick={() => copy(k.api_key, "API Key")}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-rajdhani mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Secret Hash (SHA-256)
                    </div>
                    <code className="text-xs font-mono text-muted-foreground break-all">
                      {k.api_secret_hash.slice(0, 32)}…
                    </code>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs font-rajdhani">
                  <div>
                    <span className="text-muted-foreground">Permissions: </span>
                    <span className="text-foreground">
                      {k.permissions?.length ? k.permissions.join(", ") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly req: </span>
                    <span className="text-foreground">{k.expected_monthly_requests ?? 0}</span>
                  </div>
                  {k.website_url && (
                    <div className="sm:col-span-2 truncate">
                      <span className="text-muted-foreground">URL: </span>
                      <a href={k.website_url} target="_blank" rel="noreferrer"
                        className="text-neon-cyan hover:underline">
                        {k.website_url}
                      </a>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Purpose: </span>
                    <span className="text-foreground">{k.purpose}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!revokeConfirm} onOpenChange={(o) => !o && setRevokeConfirm(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-orbitron">Revoke API Key?</DialogTitle>
            <DialogDescription>
              This will immediately disable <strong>{revokeConfirm?.application_name}</strong>
              {" "}({revokeConfirm?.api_key}). The action is logged and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeConfirm(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-orbitron text-destructive">Permanently Delete API Key?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{deleteConfirm?.application_name}</strong>
              {" "}({deleteConfirm?.api_key}) from the database. The action is logged and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
