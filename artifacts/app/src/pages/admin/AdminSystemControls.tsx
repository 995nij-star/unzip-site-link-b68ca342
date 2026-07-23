import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CyberButton } from "@/components/ui/cyber-button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet, Trophy, UserPlus, MessageSquare, ShieldAlert, Loader2, Lock, Unlock,
  Activity, Mail, Bot, Zap, CreditCard, Shield, TicketCheck, Gamepad2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmergencyBanner } from "@/components/admin/system-controls/EmergencyBanner";
import { SystemToggleCard } from "@/components/admin/system-controls/SystemToggleCard";
import { RecentActivityLog } from "@/components/admin/system-controls/RecentActivityLog";

interface SystemToggle {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const systemToggles: SystemToggle[] = [
  { key: "wallet_enabled", label: "Wallet Transactions", description: "Enable or disable all wallet deposits, withdrawals, and transfers", icon: Wallet, color: "text-neon-green" },
  { key: "tournaments_enabled", label: "Tournament Creation", description: "Allow new tournaments to be created and joined", icon: Trophy, color: "text-neon-cyan" },
  { key: "registrations_enabled", label: "User Registrations", description: "Allow new users to sign up for accounts", icon: UserPlus, color: "text-primary" },
  { key: "chat_enabled", label: "Chat System", description: "Enable or disable direct messaging and stream chat", icon: MessageSquare, color: "text-neon-orange" },
  { key: "ai_chat_widget_enabled", label: "xt Support AI Widget", description: "Show or hide the floating xt Support AI chat widget for all users", icon: Bot, color: "text-neon-purple" },
];

const autoPilotModules = [
  { key: "topups", label: "Auto-Approve Topups", description: "Automatically approve all pending wallet topup requests", icon: CreditCard, color: "text-neon-green" },
  { key: "withdrawals", label: "Auto-Approve Withdrawals", description: "Automatically process and approve pending withdrawal requests", icon: Wallet, color: "text-neon-cyan" },
  { key: "moderation", label: "Auto-Moderate Content", description: "Remove reported clips (2+ reports) and ban flagged users (3+ reports)", icon: Shield, color: "text-neon-orange" },
  { key: "tournaments", label: "Auto-Manage Tournaments", description: "Auto-start when scheduled, auto-complete after 2 hours", icon: Gamepad2, color: "text-neon-purple" },
  { key: "tickets", label: "Auto-Resolve Tickets", description: "AI-powered auto-responses to support tickets", icon: TicketCheck, color: "text-primary" },
];

export default function AdminSystemControls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emergencyLockOpen, setEmergencyLockOpen] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [lastActivatedAt, setLastActivatedAt] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // Auto-pilot state
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [autoPilotModuleStates, setAutoPilotModuleStates] = useState<Record<string, boolean>>({
    topups: true, withdrawals: true, moderation: true, tournaments: true, tickets: true,
  });
  const [autoPilotLastRun, setAutoPilotLastRun] = useState<any>(null);
  const [autoPilotLoading, setAutoPilotLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("key, value, updated_at").in("key", [
      ...systemToggles.map(t => t.key), "emergency_lock", "auto_pilot", "auto_pilot_last_run"
    ]);

    const settings: Record<string, boolean> = {};
    systemToggles.forEach(t => {
      // xt Support AI widget defaults to OFF until an admin enables it.
      settings[t.key] = t.key === "ai_chat_widget_enabled" ? false : true;
    });

    data?.forEach((row: any) => {
      if (row.key === "emergency_lock") {
        const isActive = row.value === true || row.value?.enabled === true;
        setEmergencyActive(isActive);
        if (isActive) setLastActivatedAt(row.updated_at);
      } else if (row.key === "auto_pilot") {
        const val = row.value as any;
        setAutoPilotEnabled(val?.enabled === true);
        if (val) {
          const modules = { ...autoPilotModuleStates };
          autoPilotModules.forEach(m => {
            if (val[m.key] !== undefined) modules[m.key] = val[m.key] !== false;
          });
          setAutoPilotModuleStates(modules);
        }
      } else if (row.key === "auto_pilot_last_run") {
        setAutoPilotLastRun(row.value);
      } else {
        settings[row.key] = row.value === true || row.value?.enabled === true;
      }
    });

    setToggles(settings);
    setLoading(false);
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    if (!user) return;
    setActionLoading(key);

    const { error } = await (supabase as any).from("site_settings").upsert({
      key, value: { enabled } as any, updated_by: user.id, updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setToggles(prev => ({ ...prev, [key]: enabled }));
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id, action: enabled ? "enable_system" : "disable_system",
        target_type: "system", target_id: key,
        details: { system: key, enabled } as any,
      });
      toast({
        title: `${enabled ? "✅ Enabled" : "🔴 Disabled"}`,
        description: `${key.replace(/_/g, " ")} has been ${enabled ? "enabled" : "disabled"}.`,
      });
    }
    setActionLoading(null);
  };

  // Auto-pilot toggle
  const handleAutoPilotToggle = async (enabled: boolean) => {
    if (!user) return;
    setAutoPilotLoading(true);

    const value = { enabled, ...autoPilotModuleStates };
    const { error } = await (supabase as any).from("site_settings").upsert({
      key: "auto_pilot",
      value: value as any,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setAutoPilotEnabled(enabled);
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: enabled ? "auto_pilot_enabled" : "auto_pilot_disabled",
        target_type: "system",
        target_id: "auto_pilot",
        details: value as any,
      });
      toast({
        title: enabled ? "🤖 Auto-Pilot Activated" : "⏹️ Auto-Pilot Deactivated",
        description: enabled
          ? "The platform will now operate autonomously."
          : "Auto-pilot has been turned off. Manual admin control restored.",
      });
    }
    setAutoPilotLoading(false);
  };

  const handleAutoPilotModuleToggle = async (moduleKey: string, enabled: boolean) => {
    if (!user) return;
    const newStates = { ...autoPilotModuleStates, [moduleKey]: enabled };
    setAutoPilotModuleStates(newStates);

    const value = { enabled: autoPilotEnabled, ...newStates };
    await (supabase as any).from("site_settings").upsert({
      key: "auto_pilot",
      value: value as any,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
  };

  // Manual trigger
  const handleManualRun = async () => {
    setAutoPilotLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-pilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await resp.json();
      if (data.results) {
        setAutoPilotLastRun({ timestamp: new Date().toISOString(), results: data.results });
        toast({
          title: "✅ Auto-Pilot Run Complete",
          description: `Topups: ${data.results.topups_approved || 0}, Withdrawals: ${data.results.withdrawals_approved || 0}, Clips removed: ${data.results.clips_removed || 0}, Tickets: ${data.results.tickets_resolved || 0}`,
        });
      } else if (data.status === "disabled") {
        toast({ title: "Auto-Pilot Disabled", description: "Enable auto-pilot first.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setAutoPilotLoading(false);
  };

  const sendInAppNotifications = async (activate: boolean) => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .neq("user_id", user?.id || "");

      if (profiles && profiles.length > 0) {
        const notifications = profiles.map(p => ({
          user_id: p.user_id,
          type: "system",
          title: activate ? "🚨 Platform Emergency Lockdown" : "✅ Platform Services Restored",
          message: activate
            ? "All platform services have been temporarily disabled for security. Your account and funds are safe."
            : "All platform services are back online. You can resume using all features.",
        }));

        for (let i = 0; i < notifications.length; i += 100) {
          await supabase.from("notifications").insert(notifications.slice(i, i + 100));
        }
      }
    } catch (err) {
      console.warn("Failed to send in-app notifications:", err);
    }
  };

  const handleEmergencyLock = async (activate: boolean) => {
    if (!user) return;
    setActionLoading("emergency");
    setEmailStatus(null);

    const newToggles: Record<string, boolean> = {};
    for (const t of systemToggles) {
      const enabled = !activate;
      await (supabase as any).from("site_settings").upsert({
        key: t.key, value: { enabled } as any, updated_by: user.id, updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
      newToggles[t.key] = enabled;
    }

    const now = new Date().toISOString();
    await (supabase as any).from("site_settings").upsert({
      key: "emergency_lock", value: { enabled: activate } as any, updated_by: user.id, updated_at: now,
    }, { onConflict: "key" });

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id, action: activate ? "emergency_lock_activated" : "emergency_lock_deactivated",
      target_type: "system", target_id: "emergency_lock",
      details: { activated: activate } as any,
    });

    setToggles(newToggles as any);
    setEmergencyActive(activate);
    if (activate) setLastActivatedAt(now);
    setEmergencyLockOpen(false);

    toast({
      title: activate ? "🚨 Emergency Lock Activated" : "✅ Emergency Lock Deactivated",
      description: activate ? "All systems have been disabled." : "All systems have been re-enabled.",
      variant: activate ? "destructive" : "default",
    });

    await sendInAppNotifications(activate);

    setEmailStatus("sending");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: emailResult } = await supabase.functions.invoke("send-emergency-notification", {
        body: { activated: activate },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
      setEmailStatus("sent");
      toast({
        title: "📧 Notifications Sent",
        description: emailResult?.message || "All users have been notified via email and in-app alerts.",
      });
    } catch (emailErr) {
      console.warn("Emergency email notification failed:", emailErr);
      setEmailStatus("failed");
      toast({
        title: "Email Notice",
        description: "In-app notifications sent. Email delivery had issues.",
        variant: "destructive",
      });
    }

    setActionLoading(null);
  };

  const activeCount = Object.values(toggles).filter(Boolean).length;
  const disabledCount = systemToggles.length - activeCount;

  if (loading) {
    return (
      <AdminLayout title="System Controls" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Controls" description="Manage global platform systems and emergency controls">
      {/* Emergency Banner */}
      <EmergencyBanner
        active={emergencyActive}
        lastActivatedAt={lastActivatedAt}
        onDeactivate={() => setEmergencyLockOpen(true)}
      />

      {/* ===== AUTO-PILOT SECTION ===== */}
      <div className="mb-8">
        <div className={`rounded-2xl border-2 transition-all duration-500 ${
          autoPilotEnabled
            ? "border-neon-green/40 bg-gradient-to-br from-neon-green/5 via-card/80 to-neon-cyan/5 shadow-[0_0_40px_-10px_hsl(var(--neon-green)/0.2)]"
            : "border-border/40 bg-card/50"
        }`}>
          {/* Header */}
          <div className="p-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-all duration-500 ${
                  autoPilotEnabled
                    ? "bg-neon-green/15 border border-neon-green/30 shadow-[0_0_20px_-5px_hsl(var(--neon-green)/0.3)]"
                    : "bg-muted/30 border border-border/30"
                }`}>
                  <Bot className={`w-7 h-7 transition-colors duration-300 ${
                    autoPilotEnabled ? "text-neon-green" : "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-orbitron font-bold text-lg text-foreground">Auto-Pilot</h2>
                    <Badge
                      variant={autoPilotEnabled ? "default" : "secondary"}
                      className={`font-rajdhani text-xs ${autoPilotEnabled ? "bg-neon-green/20 text-neon-green border-neon-green/30" : ""}`}
                    >
                      {autoPilotEnabled ? "🟢 ACTIVE" : "⏸️ OFF"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-rajdhani mt-0.5">
                    Let the platform run autonomously — auto-approve, auto-moderate, auto-manage.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {autoPilotLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={autoPilotEnabled}
                  onCheckedChange={handleAutoPilotToggle}
                  disabled={autoPilotLoading || emergencyActive}
                />
              </div>
            </div>

            {/* Last run info */}
            {autoPilotLastRun && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground/60 font-rajdhani">
                <Zap className="w-3 h-3" />
                Last run: {new Date(autoPilotLastRun.timestamp).toLocaleString()}
                {autoPilotLastRun.results && (
                  <span className="text-neon-green/60">
                    — {autoPilotLastRun.results.topups_approved || 0} topups, {autoPilotLastRun.results.withdrawals_approved || 0} withdrawals, {autoPilotLastRun.results.tickets_resolved || 0} tickets
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Module toggles (visible when auto-pilot is on) */}
          {autoPilotEnabled && (
            <div className="px-5 pb-5 space-y-2">
              <div className="h-px bg-border/30 mb-3" />
              <div className="grid gap-2">
                {autoPilotModules.map((mod) => (
                  <div
                    key={mod.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      autoPilotModuleStates[mod.key]
                        ? "bg-background/40 border-border/30"
                        : "bg-muted/10 border-border/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <mod.icon className={`w-4 h-4 ${autoPilotModuleStates[mod.key] ? mod.color : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-rajdhani font-bold text-sm text-foreground">{mod.label}</p>
                        <p className="font-rajdhani text-[11px] text-muted-foreground">{mod.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={autoPilotModuleStates[mod.key]}
                      onCheckedChange={(v) => handleAutoPilotModuleToggle(mod.key, v)}
                    />
                  </div>
                ))}
              </div>

              {/* Manual run button */}
              <div className="pt-2">
                <CyberButton
                  variant="outline"
                  size="sm"
                  onClick={handleManualRun}
                  disabled={autoPilotLoading}
                  className="w-full"
                >
                  {autoPilotLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                    : <><Zap className="w-4 h-4" /> Run Auto-Pilot Now</>}
                </CyberButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary + Emergency Button Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-orbitron font-bold text-neon-green">{activeCount}</p>
            <p className="text-xs text-muted-foreground font-rajdhani">Active</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-orbitron font-bold text-destructive">{disabledCount}</p>
            <p className="text-xs text-muted-foreground font-rajdhani">Disabled</p>
          </div>
          {emailStatus && (
            <>
              <div className="w-px h-8 bg-border" />
              <div className="flex items-center gap-1.5">
                <Mail className={`w-4 h-4 ${emailStatus === "sent" ? "text-neon-green" : emailStatus === "sending" ? "text-primary animate-pulse" : "text-destructive"}`} />
                <span className="text-xs text-muted-foreground font-rajdhani capitalize">{emailStatus}</span>
              </div>
            </>
          )}
        </div>
        <CyberButton
          variant={emergencyActive ? "outline" : "destructive"}
          size="lg"
          onClick={() => setEmergencyLockOpen(true)}
        >
          {emergencyActive
            ? <><Unlock className="w-5 h-5" /> Deactivate Emergency Lock</>
            : <><Lock className="w-5 h-5" /> Activate Emergency Lock</>}
        </CyberButton>
      </div>

      {/* System Toggles */}
      <div className="grid gap-3 mb-8">
        <h2 className="font-orbitron font-bold text-foreground text-sm tracking-wider flex items-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-primary" />
          SYSTEM SERVICES
        </h2>
        {systemToggles.map((toggle) => (
          <SystemToggleCard
            key={toggle.key}
            label={toggle.label}
            description={toggle.description}
            icon={toggle.icon}
            color={toggle.color}
            enabled={toggles[toggle.key] ?? true}
            loading={actionLoading === toggle.key}
            disabled={emergencyActive}
            onToggle={(v) => handleToggle(toggle.key, v)}
          />
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="font-orbitron font-bold text-foreground text-sm tracking-wider flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          RECENT ACTIVITY
        </h2>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <RecentActivityLog />
        </div>
      </div>

      {/* Emergency Lock Confirmation */}
      <Dialog open={emergencyLockOpen} onOpenChange={setEmergencyLockOpen}>
        <DialogContent className="bg-card border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-orbitron flex items-center gap-2">
              {emergencyActive
                ? <Unlock className="w-5 h-5 text-neon-green" />
                : <ShieldAlert className="w-5 h-5 text-destructive" />}
              {emergencyActive ? "Deactivate Emergency Lock" : "Activate Emergency Lock"}
            </DialogTitle>
            <DialogDescription className="font-rajdhani">
              {emergencyActive
                ? "This will re-enable all platform systems and notify all users that services are restored."
                : "This will instantly disable ALL platform systems and send emergency notifications to every user via email and in-app alerts."}
            </DialogDescription>
          </DialogHeader>

          {!emergencyActive && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive font-rajdhani">
              ⚠️ All users will receive an emergency lockdown email and in-app notification immediately.
            </div>
          )}

          <DialogFooter>
            <CyberButton variant="outline" onClick={() => setEmergencyLockOpen(false)}>
              Cancel
            </CyberButton>
            <CyberButton
              variant={emergencyActive ? "default" : "destructive"}
              onClick={() => handleEmergencyLock(!emergencyActive)}
              disabled={actionLoading === "emergency"}
            >
              {actionLoading === "emergency" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : emergencyActive ? (
                <><Unlock className="w-4 h-4" /> Deactivate</>
              ) : (
                <><Lock className="w-4 h-4" /> Activate Emergency Lock</>
              )}
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
