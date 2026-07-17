import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CyberButton } from "@/components/ui/cyber-button";
import { Loader2, Wrench, Clock, AlertTriangle, CheckCircle2, Save } from "lucide-react";

interface MaintenanceConfig {
  enabled: boolean;
  title: string;
  message: string;
  estimated_end: string;
  allow_admins: boolean;
}

const defaultConfig: MaintenanceConfig = {
  enabled: false,
  title: "We'll be back soon!",
  message: "We're performing scheduled maintenance to improve your experience. Please check back shortly.",
  estimated_end: "",
  allow_admins: true,
};

export default function AdminMaintenanceMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<MaintenanceConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "maintenance_mode").single();
    if (data?.value && typeof data.value === "object") {
      setConfig({ ...defaultConfig, ...(data.value as any) });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("site_settings").upsert({
      key: "maintenance_mode",
      value: config as any,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: config.enabled ? "maintenance_enabled" : "maintenance_disabled",
        target_type: "system",
        target_id: "maintenance_mode",
        details: config as any,
      });
      toast({
        title: config.enabled ? "🔧 Maintenance Mode Enabled" : "✅ Maintenance Mode Disabled",
        description: config.enabled ? "Users will see the maintenance page." : "Site is now accessible to all users.",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Maintenance Mode" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Maintenance Mode" description="Schedule downtime and show a maintenance page to users">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Toggle card */}
          <Card className={`p-6 border-2 transition-colors ${config.enabled ? "border-destructive/50 bg-destructive/5" : "border-neon-green/30 bg-neon-green/5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.enabled ? (
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-neon-green" />
                )}
                <div>
                  <h3 className="font-orbitron font-bold text-foreground">
                    {config.enabled ? "MAINTENANCE ACTIVE" : "SITE IS LIVE"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    {config.enabled ? "Users are seeing the maintenance page" : "All systems operational"}
                  </p>
                </div>
              </div>
              <Switch checked={config.enabled} onCheckedChange={v => setConfig(p => ({ ...p, enabled: v }))} />
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6 bg-card/60 border-border/50 space-y-5">
            <h2 className="font-orbitron text-sm font-bold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" /> Maintenance Page Settings
            </h2>

            <div className="space-y-2">
              <Label className="font-rajdhani">Title</Label>
              <Input value={config.title} onChange={e => setConfig(p => ({ ...p, title: e.target.value }))} placeholder="Maintenance title" className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <Label className="font-rajdhani">Message</Label>
              <Textarea value={config.message} onChange={e => setConfig(p => ({ ...p, message: e.target.value }))} rows={4} className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <Label className="font-rajdhani flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Estimated End Time</Label>
              <Input type="datetime-local" value={config.estimated_end} onChange={e => setConfig(p => ({ ...p, estimated_end: e.target.value }))} className="bg-background/50" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/50">
              <div>
                <p className="text-sm font-rajdhani font-medium text-foreground">Allow Admin Access</p>
                <p className="text-xs text-muted-foreground">Admins can still browse the site during maintenance</p>
              </div>
              <Switch checked={config.allow_admins} onCheckedChange={v => setConfig(p => ({ ...p, allow_admins: v }))} />
            </div>

            <CyberButton onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save & Apply</>}
            </CyberButton>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-5 bg-card/60 border-border/50">
            <h3 className="font-orbitron text-xs font-bold text-foreground mb-4">PREVIEW</h3>
            <div className="rounded-xl border border-border bg-background p-6 text-center space-y-3">
              <Wrench className="w-10 h-10 text-primary mx-auto" />
              <h4 className="font-orbitron font-bold text-foreground text-sm">{config.title || "Maintenance"}</h4>
              <p className="text-xs text-muted-foreground font-rajdhani">{config.message || "We'll be back soon."}</p>
              {config.estimated_end && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-rajdhani">
                  <Clock className="w-3 h-3" />
                  Back by: {new Date(config.estimated_end).toLocaleString()}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
