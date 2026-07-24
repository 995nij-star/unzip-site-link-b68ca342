import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Key, Shield, Code2, AlertTriangle, Sparkles, Trash2, X } from "lucide-react";

const PERMISSIONS = [
  { id: "read_user_data", label: "Read User Data" },
  { id: "read_tournament_data", label: "Read Tournament Data" },
  { id: "read_match_data", label: "Read Match Data" },
  { id: "create_tournament", label: "Create Tournament" },
  { id: "manage_teams", label: "Manage Teams" },
];

function randomString(len: number, prefix = "") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = prefix;
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface KeyRow {
  id: string;
  application_name: string;
  api_key: string;
  status: string;
  created_at: string;
  permissions: string[];
}

export default function DeveloperApi() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [revealed, setRevealed] = useState<{ apiKey: string; apiSecret: string; createdAt: string } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<KeyRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const [form, setForm] = useState({
    developer_name: "",
    email: user?.email || "",
    company: "",
    application_name: "",
    website_url: "",
    purpose: "",
    expected_monthly_requests: 1000,
    permissions: [] as string[],
    terms: false,
  });

  useEffect(() => {
    if (user?.email && !form.email) setForm((f) => ({ ...f, email: user.email! }));
  }, [user]);

  const loadKeys = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("developer_api_keys")
      .select("id, application_name, api_key, status, created_at, permissions")
      .order("created_at", { ascending: false });
    if (data) setKeys(data as KeyRow[]);
  };

  useEffect(() => { loadKeys(); }, [user]);

  const togglePerm = (id: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id) ? f.permissions.filter((p) => p !== id) : [...f.permissions, id],
    }));
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in"); return; }
    if (!form.terms) { toast.error("You must accept the Terms of Service"); return; }
    if (!form.developer_name || !form.email || !form.application_name || !form.purpose) {
      toast.error("Please fill required fields"); return;
    }

    setLoading(true);
    try {
      const apiKey = randomString(32, "xtk_");
      const apiSecret = randomString(48, "xts_");
      const secretHash = await sha256(apiSecret);

      const { error } = await (supabase as any).from("developer_api_keys").insert({
        user_id: user.id,
        developer_name: form.developer_name,
        email: form.email,
        company: form.company || null,
        application_name: form.application_name,
        website_url: form.website_url || null,
        purpose: form.purpose,
        permissions: form.permissions,
        expected_monthly_requests: form.expected_monthly_requests,
        api_key: apiKey,
        api_secret_hash: secretHash,
        terms_accepted: form.terms,
        status: "active",
      });
      if (error) throw error;

      setRevealed({ apiKey, apiSecret, createdAt: new Date().toISOString() });
      setForm({
        developer_name: "", email: user.email || "", company: "", application_name: "",
        website_url: "", purpose: "", expected_monthly_requests: 1000, permissions: [], terms: false,
      });
      loadKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate key");
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string) => {
    if (!user) return;
    setRevoking(true);
    try {
      const { error } = await (supabase as any).from("developer_api_keys").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;

      toast.success("Key revoked");
      setRevokeConfirm(null);
      loadKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke key");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[hsl(var(--neon-blue)/0.05)] py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[hsl(var(--neon-blue))]" />
            <span className="text-xs uppercase tracking-widest text-[hsl(var(--neon-blue))]">Developer Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[hsl(var(--neon-blue))] via-primary to-[hsl(var(--neon-purple,260_80%_60%))] bg-clip-text text-transparent">
            XT eSports Developer API
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Build powerful integrations with tournaments, matches, teams, and live data. Generate your API credentials below.
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 md:p-8 backdrop-blur-xl bg-card/40 border-[hsl(var(--neon-blue)/0.2)] shadow-[0_0_40px_-15px_hsl(var(--neon-blue)/0.4)]">
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-5 h-5 text-[hsl(var(--neon-blue))]" />
            <h2 className="text-xl font-semibold">Generate API Key</h2>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Developer Name *</Label>
              <Input value={form.developer_name} onChange={(e) => setForm({ ...form, developer_name: e.target.value })} required />
            </div>
            <div>
              <Label>Email Address *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Company / Organization</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <Label>Application Name *</Label>
              <Input value={form.application_name} onChange={(e) => setForm({ ...form, application_name: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <Label>Website / Application URL</Label>
              <Input type="url" placeholder="https://" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Purpose of API Usage *</Label>
              <Textarea rows={4} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required
                placeholder="Describe how you plan to use the XT eSports API…" />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-3 block">Required Permissions</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERMISSIONS.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-md border border-border/50 bg-background/40 hover:border-[hsl(var(--neon-blue)/0.4)] transition cursor-pointer">
                    <Checkbox checked={form.permissions.includes(p.id)} onCheckedChange={() => togglePerm(p.id)} />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Expected Monthly Requests</Label>
              <Input type="number" min={0} value={form.expected_monthly_requests}
                onChange={(e) => setForm({ ...form, expected_monthly_requests: parseInt(e.target.value) || 0 })} />
            </div>

            <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-md border border-border/50 bg-background/30">
              <Checkbox id="tos" checked={form.terms} onCheckedChange={(c) => setForm({ ...form, terms: !!c })} />
              <Label htmlFor="tos" className="text-sm leading-relaxed cursor-pointer">
                I agree to the XT eSports <span className="text-[hsl(var(--neon-blue))]">Developer Terms of Service</span> and accept the API usage policies, rate limits, and data handling guidelines. *
              </Label>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={loading} className="w-full md:w-auto bg-gradient-to-r from-[hsl(var(--neon-blue))] to-primary hover:opacity-90 shadow-[0_0_20px_-5px_hsl(var(--neon-blue)/0.6)]">
                <Key className="w-4 h-4 mr-2" />
                {loading ? "Generating…" : "Generate API Key"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Dashboard */}
        <Card className="p-6 md:p-8 backdrop-blur-xl bg-card/40 border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <Code2 className="w-5 h-5 text-[hsl(var(--neon-blue))]" />
            <h2 className="text-xl font-semibold">Your API Keys</h2>
            <Badge variant="outline" className="ml-2">{keys.length}</Badge>
          </div>
          {keys.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No API keys yet. Generate your first one above.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.id} className="p-4 rounded-lg border border-border/50 bg-background/40 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{k.application_name}</span>
                      <Badge className={k.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                        {k.status}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground break-all">{k.api_key}</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(k.created_at).toLocaleString()} · {k.permissions.length} permissions
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(k.api_key, "API Key")}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                    {k.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => setRevokeConfirm(k)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent className="max-w-lg backdrop-blur-xl bg-card/95 border-[hsl(var(--neon-blue)/0.4)]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[hsl(var(--neon-blue))]" />
              API Credentials Generated
            </DialogTitle>
          </DialogHeader>
          {revealed && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-200">
                  <strong>Save your API Secret now.</strong> It will not be shown again.
                </p>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 p-2 rounded bg-background/60 border border-border text-xs break-all">{revealed.apiKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(revealed.apiKey, "API Key")}><Copy className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">API Secret</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 p-2 rounded bg-background/60 border border-border text-xs break-all">{revealed.apiSecret}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(revealed.apiSecret, "API Secret")}><Copy className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Created</Label>
                  <p>{new Date(revealed.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                </div>
              </div>

              <Button className="w-full" onClick={() => setRevealed(null)}>I have saved my credentials</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Revoke Confirmation Modal */}
      <Dialog open={!!revokeConfirm} onOpenChange={(o) => !o && setRevokeConfirm(null)}>
        <DialogContent className="max-w-md backdrop-blur-xl bg-card/95 border-red-500/30" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. The key will immediately stop working.
            </DialogDescription>
          </DialogHeader>
          {revokeConfirm && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-background/60 border border-border">
                <p className="text-sm font-medium">{revokeConfirm.application_name}</p>
                <code className="text-xs text-muted-foreground break-all">{revokeConfirm.api_key}</code>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setRevokeConfirm(null)} disabled={revoking}>
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => revoke(revokeConfirm.id)} disabled={revoking}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {revoking ? "Revoking…" : "Revoke Key"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
