import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Zap, AlertTriangle, Ban, VolumeX, Clock } from "lucide-react";
import { format } from "date-fns";

const triggerTypes = [
  { value: "report_count", label: "Reports received", description: "Triggers when a user receives X reports" },
  { value: "failed_logins", label: "Failed login attempts", description: "Triggers after X failed logins" },
  { value: "suspicious_activity", label: "Suspicious activities", description: "Triggers after X suspicious activity flags" },
  { value: "redeem_attempts", label: "Failed redeem attempts", description: "Triggers after X failed redeem attempts" },
];

const actionTypes = [
  { value: "shadow_ban", label: "Shadow Ban", icon: VolumeX },
  { value: "ban", label: "Ban Account", icon: Ban },
  { value: "reduce_trust", label: "Reduce Trust Score", icon: AlertTriangle },
];

export default function AdminAutomationRules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger_type: "report_count",
    trigger_threshold: 5,
    action_type: "shadow_ban",
    action_duration_hours: 24,
  });

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from("automation_rules").select("*").order("created_at", { ascending: false });
    setRules(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.name.trim()) return;
    setActionLoading(true);

    const { error } = await (supabase as any).from("automation_rules").insert({
      ...form,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id, action: "create_automation_rule",
        target_type: "automation_rule", details: form as any,
      });
      toast({ title: "Rule Created" });
      setDialogOpen(false);
      setForm({ name: "", trigger_type: "report_count", trigger_threshold: 5, action_type: "shadow_ban", action_duration_hours: 24 });
      fetchRules();
    }
    setActionLoading(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("automation_rules").update({ is_active: active }).eq("id", id);
    setRules(rules.map(r => r.id === id ? { ...r, is_active: active } : r));
    toast({ title: active ? "Rule Enabled" : "Rule Disabled" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await supabase.from("automation_rules").delete().eq("id", id);
    setRules(rules.filter(r => r.id !== id));
    toast({ title: "Rule Deleted" });
  };

  if (loading) {
    return (
      <AdminLayout title="Automation Rules" description="Loading...">
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Automation Rules" description="Create automated responses to suspicious behavior">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground font-rajdhani">{rules.length} rule(s) configured</p>
        <CyberButton onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Create Rule
        </CyberButton>
      </div>

      <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="font-rajdhani">Rule</TableHead>
              <TableHead className="font-rajdhani">Trigger</TableHead>
              <TableHead className="font-rajdhani">Action</TableHead>
              <TableHead className="font-rajdhani">Duration</TableHead>
              <TableHead className="font-rajdhani">Status</TableHead>
              <TableHead className="font-rajdhani text-right">Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12 font-rajdhani">No automation rules configured</TableCell></TableRow>
            ) : rules.map((rule) => (
              <TableRow key={rule.id} className="border-border">
                <TableCell className="font-rajdhani font-medium">{rule.name}</TableCell>
                <TableCell className="font-rajdhani text-sm">
                  {triggerTypes.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type} ≥ {rule.trigger_threshold}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-rajdhani capitalize">{rule.action_type.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="font-rajdhani text-sm">{rule.action_duration_hours}h</TableCell>
                <TableCell>
                  <Switch checked={rule.is_active} onCheckedChange={(v) => handleToggle(rule.id, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <CyberButton variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="w-4 h-4" />
                  </CyberButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Create Automation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Rule Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Auto-ban after 5 reports" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Trigger</Label>
                <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Threshold</Label>
                <Input type="number" min={1} value={form.trigger_threshold} onChange={(e) => setForm({ ...form, trigger_threshold: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Action</Label>
                <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Duration (hours)</Label>
                <Input type="number" min={1} value={form.action_duration_hours} onChange={(e) => setForm({ ...form, action_duration_hours: parseInt(e.target.value) || 24 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <CyberButton variant="outline" onClick={() => setDialogOpen(false)}>Cancel</CyberButton>
            <CyberButton onClick={handleCreate} disabled={actionLoading || !form.name.trim()}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Create Rule
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
