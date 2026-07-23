import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CyberButton } from "@/components/ui/cyber-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Copy, ShieldPlus, Replace } from "lucide-react";

interface Mod {
  user_id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  duty_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceModeratorId: string;
  sourceModeratorName: string;
  onCopied?: () => void;
}

export function CopyModeratorDutiesDialog({
  open, onOpenChange, sourceModeratorId, sourceModeratorName, onCopied,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [mods, setMods] = useState<Mod[]>([]);
  const [sourceDuties, setSourceDuties] = useState<
    { permission: string; notes: string | null }[]
  >([]);
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setTargetId(null);
      setSearch("");
      setMode("merge");

      const [{ data: roles }, { data: profiles }, { data: perms }, { data: srcDuties }] =
        await Promise.all([
          supabase.from("user_roles").select("user_id").eq("role", "moderator"),
          supabase.from("profiles").select("user_id, username, email, avatar_url"),
          (supabase as any).from("moderator_permissions").select("moderator_id"),
          (supabase as any)
            .from("moderator_permissions")
            .select("permission, notes")
            .eq("moderator_id", sourceModeratorId),
        ]);

      const counts: Record<string, number> = {};
      perms?.forEach((p: any) => {
        counts[p.moderator_id] = (counts[p.moderator_id] || 0) + 1;
      });

      const modIds = new Set(roles?.map((r) => r.user_id));
      const list: Mod[] = (profiles || [])
        .filter((p) => modIds.has(p.user_id) && p.user_id !== sourceModeratorId)
        .map((p) => ({ ...p, duty_count: counts[p.user_id] || 0 }));

      list.sort((a, b) =>
        (a.username || a.email || "").localeCompare(b.username || b.email || ""),
      );

      setMods(list);
      setSourceDuties(srcDuties || []);
      setLoading(false);
    })();
  }, [open, sourceModeratorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mods;
    return mods.filter(
      (m) =>
        m.username?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    );
  }, [mods, search]);

  const target = mods.find((m) => m.user_id === targetId) || null;

  const handleCopy = async () => {
    if (!user || !target) return;
    if (sourceDuties.length === 0) {
      toast({
        title: "Nothing to copy",
        description: `${sourceModeratorName} has no duties assigned.`,
        variant: "destructive",
      });
      return;
    }
    setCopying(true);
    try {
      if (mode === "replace") {
        const { error: delErr } = await (supabase as any)
          .from("moderator_permissions")
          .delete()
          .eq("moderator_id", target.user_id);
        if (delErr) throw delErr;
      }

      // Load existing to avoid unique-constraint failures on merge
      const { data: existing } = await (supabase as any)
        .from("moderator_permissions")
        .select("permission")
        .eq("moderator_id", target.user_id);
      const existingSet = new Set((existing || []).map((r: any) => r.permission));

      const rows = sourceDuties
        .filter((d) => mode === "replace" || !existingSet.has(d.permission))
        .map((d) => ({
          moderator_id: target.user_id,
          permission: d.permission,
          notes: d.notes,
          assigned_by: user.id,
        }));

      let inserted = 0;
      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any)
          .from("moderator_permissions")
          .insert(rows);
        if (insErr) throw insErr;
        inserted = rows.length;
      }

      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "moderator_duties_copied",
        target_type: "user",
        target_id: target.user_id,
        details: {
          source_moderator_id: sourceModeratorId,
          mode,
          copied_count: inserted,
          total_source_duties: sourceDuties.length,
        } as any,
      });

      toast({
        title: "✅ Duties Copied",
        description:
          mode === "replace"
            ? `Replaced ${target.username || "moderator"}'s duties with ${inserted} from ${sourceModeratorName}.`
            : `Added ${inserted} new duty(ies) to ${target.username || "moderator"} (skipped ${sourceDuties.length - inserted} already assigned).`,
      });
      onCopied?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCopying(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg bg-card border-border/60"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="font-orbitron flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Copy Duties from {sourceModeratorName}
          </DialogTitle>
          <DialogDescription className="font-rajdhani">
            Pick another moderator to receive this set of{" "}
            <strong>{sourceDuties.length}</strong> duty(ies).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search moderators…"
                className="pl-9 bg-background/50"
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/30">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground font-rajdhani">
                  No other moderators found.
                </p>
              ) : (
                filtered.map((m) => {
                  const active = targetId === m.user_id;
                  return (
                    <button
                      key={m.user_id}
                      onClick={() => setTargetId(m.user_id)}
                      className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${
                        active
                          ? "bg-primary/10"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={m.avatar_url || ""} />
                        <AvatarFallback className="text-xs bg-muted">
                          {(m.username || m.email || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-rajdhani font-medium text-foreground truncate">
                          {m.username || "Unnamed"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {m.email || "—"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-primary/5 border-primary/30 text-primary font-rajdhani"
                      >
                        {m.duty_count} {m.duty_count === 1 ? "duty" : "duties"}
                      </Badge>
                      {active && (
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {target && (
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as any)}
                className="grid grid-cols-2 gap-2 pt-1"
              >
                <label
                  className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                    mode === "merge"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/40 hover:border-border/70"
                  }`}
                >
                  <RadioGroupItem value="merge" id="cm-merge" className="mt-0.5" />
                  <div>
                    <Label
                      htmlFor="cm-merge"
                      className="flex items-center gap-1.5 text-sm font-rajdhani font-semibold cursor-pointer"
                    >
                      <ShieldPlus className="w-3.5 h-3.5 text-neon-green" /> Merge
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Keep existing duties, add new ones.
                    </p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                    mode === "replace"
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border/40 hover:border-border/70"
                  }`}
                >
                  <RadioGroupItem value="replace" id="cm-replace" className="mt-0.5" />
                  <div>
                    <Label
                      htmlFor="cm-replace"
                      className="flex items-center gap-1.5 text-sm font-rajdhani font-semibold cursor-pointer"
                    >
                      <Replace className="w-3.5 h-3.5 text-destructive" /> Replace
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Wipe target's duties first, then copy.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            )}
          </>
        )}

        <DialogFooter className="gap-2">
          <CyberButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={copying}
          >
            Cancel
          </CyberButton>
          <CyberButton
            onClick={handleCopy}
            disabled={copying || loading || !target || sourceDuties.length === 0}
          >
            {copying ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copy to {target?.username || "moderator"}
          </CyberButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
