import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CyberButton } from "@/components/ui/cyber-button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Shield, Users, MessageSquare, Trophy, Wallet, Film,
  AlertTriangle, Megaphone, ShieldCheck, Ban, Gavel, FileCheck,
} from "lucide-react";

export interface DutyDefinition {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
}

// Central catalog of responsibilities an admin can assign to a moderator.
export const MOD_DUTIES: DutyDefinition[] = [
  { key: "review_reports",       label: "Review User Reports",   description: "Investigate reports filed against players.",        icon: AlertTriangle, color: "text-neon-orange" },
  { key: "moderate_chats",       label: "Moderate Chats",        description: "Watch DMs and stream chats for abuse.",             icon: MessageSquare, color: "text-neon-blue" },
  { key: "moderate_clips",       label: "Moderate Clips",        description: "Approve, hide or remove uploaded gaming clips.",    icon: Film,          color: "text-neon-pink" },
  { key: "ban_users",            label: "Ban / Shadow-Ban Users",description: "Temporarily block violators (with audit log).",     icon: Ban,           color: "text-destructive" },
  { key: "resolve_tickets",      label: "Resolve Support Tickets",description: "Reply to and close help-center tickets.",           icon: ShieldCheck,   color: "text-neon-cyan" },
  { key: "manage_tournaments",   label: "Manage Tournaments",    description: "Create matches, update rooms, publish results.",    icon: Trophy,        color: "text-neon-gold" },
  { key: "review_kyc",           label: "Review KYC Submissions",description: "Approve or reject identity documents.",             icon: FileCheck,     color: "text-neon-green" },
  { key: "handle_withdrawals",   label: "Handle Withdrawals",    description: "Verify UPI payouts and mark them processed.",       icon: Wallet,        color: "text-neon-green" },
  { key: "post_announcements",   label: "Post Announcements",    description: "Publish platform-wide news banners.",               icon: Megaphone,     color: "text-neon-pink" },
  { key: "monitor_fraud",        label: "Monitor Fraud Alerts",  description: "Watch suspicious multi-account & brute-force signals.", icon: Shield,    color: "text-neon-purple" },
  { key: "enforce_rules",        label: "Enforce Community Rules", description: "Issue warnings and enforce fair-play policy.",    icon: Gavel,         color: "text-neon-orange" },
  { key: "assist_users",         label: "Assist New Users",      description: "Onboard and guide newcomers in chat.",              icon: Users,         color: "text-neon-cyan" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moderatorId: string;
  moderatorName: string;
}

export function ModeratorDutiesDialog({ open, onOpenChange, moderatorId, moderatorName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("moderator_permissions")
        .select("permission, notes")
        .eq("moderator_id", moderatorId);
      const s = new Set<string>();
      const n: Record<string, string> = {};
      data?.forEach((r: any) => {
        s.add(r.permission);
        if (r.notes) n[r.permission] = r.notes;
      });
      setSelected(s);
      setNotes(n);
      setLoading(false);
    })();
  }, [open, moderatorId]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Wipe existing and re-insert selection (simple + atomic-ish for small sets)
      await (supabase as any).from("moderator_permissions").delete().eq("moderator_id", moderatorId);
      if (selected.size > 0) {
        const rows = Array.from(selected).map((permission) => ({
          moderator_id: moderatorId,
          permission,
          assigned_by: user.id,
          notes: notes[permission]?.trim() || null,
        }));
        const { error } = await (supabase as any).from("moderator_permissions").insert(rows);
        if (error) throw error;
      }
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "moderator_duties_updated",
        target_type: "user",
        target_id: moderatorId,
        details: { duties: Array.from(selected) } as any,
      });
      toast({ title: "✅ Duties Updated", description: `Saved ${selected.size} duty(ies) for ${moderatorName}.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border/60" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-orbitron flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Assign Duties — {moderatorName}
          </DialogTitle>
          <DialogDescription className="font-rajdhani">
            Select which responsibilities this moderator is authorised to handle. Add optional notes per duty (e.g. shift timing, scope).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 px-1">
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                {selected.size} of {MOD_DUTIES.length} assigned
              </Badge>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(MOD_DUTIES.map((d) => d.key)))}
                  className="text-xs font-rajdhani text-primary hover:underline"
                >
                  Select all
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-rajdhani text-muted-foreground hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              {MOD_DUTIES.map((duty) => {
                const isOn = selected.has(duty.key);
                const Icon = duty.icon;
                return (
                  <div
                    key={duty.key}
                    className={`rounded-xl border p-3 transition-all ${
                      isOn
                        ? "bg-primary/5 border-primary/40"
                        : "bg-background/30 border-border/40 hover:border-border/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isOn}
                        onCheckedChange={() => toggle(duty.key)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Icon className={`w-4 h-4 ${duty.color}`} />
                          <span className="font-rajdhani font-semibold text-sm text-foreground">
                            {duty.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-rajdhani">
                          {duty.description}
                        </p>
                        {isOn && (
                          <Textarea
                            value={notes[duty.key] || ""}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [duty.key]: e.target.value }))
                            }
                            placeholder="Optional note (scope, shift, limits)…"
                            className="mt-2 text-xs min-h-[52px] bg-background/60"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <CyberButton variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </CyberButton>
          <CyberButton onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Duties
          </CyberButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
