import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, AlertTriangle, Fingerprint, Globe, Users, Trophy,
  Wallet, Loader2, RefreshCw, Ban, EyeOff, Flag, CheckCircle2,
  X, ChevronDown, ChevronUp, Smartphone, Clock, Zap, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FraudAlert {
  id: string;
  alert_type: string;
  risk_level: string;
  title: string;
  description: string;
  affected_user_ids: string[];
  device_id: string | null;
  ip_address: string | null;
  metadata: any;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  user_id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_shadow_banned: boolean;
  uid: string | null;
}

interface ScanResult {
  scanned_at: string;
  new_alerts_found: number;
  total_open: number;
  total_high_risk: number;
  stats: Record<string, number>;
  alerts: FraudAlert[];
  profiles: Record<string, Profile>;
}

const alertTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  multi_account_device: { icon: Smartphone, label: "Multi-Account (Device)", color: "text-neon-orange" },
  multi_account_ip: { icon: Globe, label: "Multi-Account (IP)", color: "text-neon-purple" },
  duplicate_tournament_entry: { icon: Trophy, label: "Duplicate Tournament Entry", color: "text-neon-gold" },
  brute_force: { icon: Shield, label: "Brute Force", color: "text-destructive" },
  suspicious_login: { icon: Globe, label: "Suspicious Login", color: "text-neon-cyan" },
  rapid_account_creation: { icon: Users, label: "Rapid Account Creation", color: "text-neon-pink" },
  suspicious_wallet: { icon: Wallet, label: "Suspicious Wallet", color: "text-neon-green" },
};

const riskColors: Record<string, string> = {
  high: "text-destructive bg-destructive/10 border-destructive/30",
  medium: "text-neon-orange bg-neon-orange/10 border-neon-orange/30",
  low: "text-neon-blue bg-neon-blue/10 border-neon-blue/30",
};

const statusColors: Record<string, string> = {
  open: "bg-destructive/15 text-destructive",
  reviewing: "bg-neon-orange/15 text-neon-orange",
  resolved: "bg-neon-green/15 text-neon-green",
  dismissed: "bg-muted text-muted-foreground",
};

export default function AdminFraudMonitor() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ type: string; userId: string; alertId: string } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("fraud-detection");
      if (error) throw error;
      setResult(data);
      if (data.new_alerts_found > 0) {
        toast.warning(`🚨 ${data.new_alerts_found} new fraud alert(s) detected!`);
      } else if (data.total_open > 0) {
        toast.info(`${data.total_open} open alert(s). No new threats found.`);
      } else {
        toast.success("No fraud detected. Platform is clean!");
      }
    } catch (err: any) {
      toast.error("Scan failed: " + (err.message || "Unknown error"));
    } finally {
      setScanning(false);
    }
  };

  // Real-time subscription for new alerts
  useEffect(() => {
    const channel = supabase
      .channel("fraud-alerts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fraud_alerts" }, (payload) => {
        toast.warning(`🚨 New fraud alert: ${(payload.new as any).title}`, { duration: 8000 });
        // Refresh data
        runScan();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateAlertStatus = async (alertId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke("fraud-detection", {
        body: { action: "update_status", alertId, status, notes },
      });
      if (error) throw error;
      toast.success(`Alert ${status}`);
      await runScan();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  const handleAdminAction = async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("fraud-detection", {
        body: { action: actionDialog.type, userId: actionDialog.userId, reason: actionReason },
      });
      if (error) throw error;
      const labels: Record<string, string> = { ban_user: "banned", suspend_user: "suspended", flag_user: "flagged" };
      toast.success(`User ${labels[actionDialog.type] || "actioned"} successfully`);
      setActionDialog(null);
      setActionReason("");
      await runScan();
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredAlerts = (result?.alerts || []).filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (activeTab === "all") return true;
    return a.alert_type === activeTab;
  });

  const getProfile = (userId: string) => result?.profiles[userId];

  return (
    <AdminLayout title="Fraud Monitor" description="Multi-account and fraud detection system">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-orbitron font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive to-neon-orange flex items-center justify-center shadow-lg shadow-destructive/20">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              Fraud Monitor
            </h1>
            <p className="text-muted-foreground font-rajdhani mt-1">
              Detect multi-accounts, suspicious activity, and tournament cheating.
            </p>
          </div>
          <Button
            onClick={runScan}
            disabled={scanning}
            className="gap-2 font-rajdhani bg-gradient-to-r from-destructive to-neon-orange hover:opacity-90"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? "Scanning..." : "Run Fraud Scan"}
          </Button>
        </div>

        {/* Stats Dashboard */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-orbitron font-bold text-foreground">{result.total_open}</p>
                <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider mt-1">Open Alerts</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-destructive/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-orbitron font-bold text-destructive">{result.total_high_risk}</p>
                <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider mt-1">High Risk</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-neon-orange/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-orbitron font-bold text-neon-orange">{result.new_alerts_found}</p>
                <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider mt-1">New This Scan</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-neon-green/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-orbitron font-bold text-neon-green">
                  {result.alerts.filter((a) => a.status === "resolved").length}
                </p>
                <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider mt-1">Resolved</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Threat Category Breakdown */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {Object.entries(alertTypeConfig).map(([key, config]) => {
              const Icon = config.icon;
              const count = result.stats[key.replace("multi_account_device", "multi_account_device")] || 0;
              // Map to correct stat key
              const statKeyMap: Record<string, string> = {
                multi_account_device: "multi_account_device",
                multi_account_ip: "multi_account_ip",
                duplicate_tournament_entry: "duplicate_tournament",
                brute_force: "brute_force",
                suspicious_login: "suspicious_login",
                rapid_account_creation: "rapid_creation",
                suspicious_wallet: "suspicious_wallet",
              };
              const statCount = result.stats[statKeyMap[key]] || 0;
              return (
                <Card
                  key={key}
                  className={cn(
                    "bg-card/50 border-border/40 backdrop-blur-sm cursor-pointer hover:border-border/60 transition-all",
                    activeTab === key && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => setActiveTab(activeTab === key ? "all" : key)}
                >
                  <CardContent className="p-3 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${config.color}`} />
                    <p className="text-lg font-orbitron font-bold text-foreground">{statCount}</p>
                    <p className="text-[8px] font-rajdhani text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">
                      {config.label}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Status Filter */}
        {result && (
          <div className="flex flex-wrap gap-2">
            {["open", "reviewing", "resolved", "dismissed", "all"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="font-rajdhani text-xs capitalize"
                onClick={() => setStatusFilter(s)}
              >
                {s} {s !== "all" ? `(${result.alerts.filter((a) => a.status === s).length})` : ""}
              </Button>
            ))}
          </div>
        )}

        {/* Alert List */}
        {result && filteredAlerts.length > 0 && (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const typeConfig = alertTypeConfig[alert.alert_type] || { icon: AlertTriangle, label: alert.alert_type, color: "text-muted-foreground" };
              const TypeIcon = typeConfig.icon;
              const isExpanded = expandedAlerts.has(alert.id);

              return (
                <Card key={alert.id} className={cn(
                  "bg-card/50 border-border/40 backdrop-blur-sm transition-all",
                  alert.risk_level === "high" && "border-destructive/30 shadow-lg shadow-destructive/10",
                  alert.risk_level === "medium" && "border-neon-orange/20",
                )}>
                  <CardContent className="p-4">
                    {/* Alert Header */}
                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleExpand(alert.id)}>
                      <div className={`mt-0.5 ${typeConfig.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-rajdhani font-semibold text-foreground text-sm">{alert.title}</h3>
                          <Badge className={cn("text-[10px] uppercase tracking-wider border", riskColors[alert.risk_level])}>
                            {alert.risk_level} risk
                          </Badge>
                          <Badge className={cn("text-[10px] uppercase tracking-wider", statusColors[alert.status])}>
                            {alert.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-rajdhani mt-1">{alert.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-rajdhani">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                          {alert.device_id && (
                            <span className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              {alert.device_id.substring(0, 12)}...
                            </span>
                          )}
                          {alert.ip_address && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {alert.ip_address}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-orbitron font-bold text-foreground">
                          {alert.affected_user_ids?.length || 0}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                        {/* Affected Users */}
                        {alert.affected_user_ids && alert.affected_user_ids.length > 0 && (
                          <div>
                            <p className="text-xs font-rajdhani font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Affected Accounts ({alert.affected_user_ids.length})
                            </p>
                            <div className="space-y-2">
                              {alert.affected_user_ids.map((uid) => {
                                const profile = getProfile(uid);
                                return (
                                  <div key={uid} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-border/20">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={profile?.avatar_url || ""} />
                                      <AvatarFallback className="text-xs bg-primary/20">
                                        {(profile?.username || "?")[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-rajdhani font-semibold text-foreground truncate">
                                        {profile?.username || "Unknown"}
                                        {profile?.is_banned && <Badge variant="destructive" className="ml-2 text-[8px]">BANNED</Badge>}
                                        {profile?.is_shadow_banned && <Badge variant="outline" className="ml-2 text-[8px]">SHADOW</Badge>}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {profile?.email || uid} • UID: {profile?.uid || "N/A"}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                                        onClick={(e) => { e.stopPropagation(); setActionDialog({ type: "ban_user", userId: uid, alertId: alert.id }); }}
                                      >
                                        <Ban className="w-3 h-3 mr-1" /> Ban
                                      </Button>
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-7 px-2 text-[10px] text-neon-orange hover:bg-neon-orange/10"
                                        onClick={(e) => { e.stopPropagation(); setActionDialog({ type: "suspend_user", userId: uid, alertId: alert.id }); }}
                                      >
                                        <EyeOff className="w-3 h-3 mr-1" /> Suspend
                                      </Button>
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-7 px-2 text-[10px] text-neon-cyan hover:bg-neon-cyan/10"
                                        onClick={(e) => { e.stopPropagation(); setActionDialog({ type: "flag_user", userId: uid, alertId: alert.id }); }}
                                      >
                                        <Flag className="w-3 h-3 mr-1" /> Flag
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                          <div>
                            <p className="text-xs font-rajdhani font-semibold text-muted-foreground uppercase tracking-wider mb-2">Details</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.entries(alert.metadata).map(([key, val]) => (
                                <div key={key} className="p-2 rounded-lg bg-white/[0.02] border border-border/20">
                                  <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                                  <p className="text-sm font-rajdhani font-semibold text-foreground truncate">
                                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Admin Notes */}
                        {alert.admin_notes && (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Admin Notes</p>
                            <p className="text-sm font-rajdhani text-foreground">{alert.admin_notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {alert.status === "open" || alert.status === "reviewing" ? (
                          <div className="flex gap-2 pt-2">
                            {alert.status === "open" && (
                              <Button size="sm" variant="outline" className="font-rajdhani text-xs gap-1 text-neon-orange border-neon-orange/30 hover:bg-neon-orange/10"
                                onClick={() => updateAlertStatus(alert.id, "reviewing")}>
                                <Zap className="w-3 h-3" /> Mark Reviewing
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="font-rajdhani text-xs gap-1 text-neon-green border-neon-green/30 hover:bg-neon-green/10"
                              onClick={() => updateAlertStatus(alert.id, "resolved", "Reviewed and resolved by admin.")}>
                              <CheckCircle2 className="w-3 h-3" /> Resolve
                            </Button>
                            <Button size="sm" variant="outline" className="font-rajdhani text-xs gap-1 text-muted-foreground border-border/30"
                              onClick={() => updateAlertStatus(alert.id, "dismissed", "False positive - dismissed.")}>
                              <X className="w-3 h-3" /> Dismiss
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground font-rajdhani">
                            {alert.resolved_at && `Resolved at ${new Date(alert.resolved_at).toLocaleString()}`}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty States */}
        {result && filteredAlerts.length === 0 && (
          <Card className="bg-card/50 border-neon-green/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-3" />
              <p className="text-lg font-rajdhani font-semibold text-foreground">All Clear!</p>
              <p className="text-sm text-muted-foreground">No fraud alerts in this category.</p>
            </CardContent>
          </Card>
        )}

        {!result && !scanning && (
          <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Fingerprint className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-rajdhani font-semibold text-foreground">Fraud Detection System</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                Click "Run Fraud Scan" to detect multi-accounts, suspicious activity, duplicate tournament entries, and wallet fraud.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 max-w-2xl mx-auto">
                {[
                  { icon: Smartphone, label: "Multi-Account Detection" },
                  { icon: Trophy, label: "Tournament Fraud" },
                  { icon: Shield, label: "Brute Force Detection" },
                  { icon: Wallet, label: "Wallet Fraud" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-border/30">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] font-rajdhani text-muted-foreground text-center">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {scanning && (
          <Card className="bg-card/50 border-destructive/30 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <Loader2 className="w-20 h-20 text-destructive animate-spin absolute inset-0" />
                <Fingerprint className="w-8 h-8 text-destructive/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-rajdhani font-semibold text-foreground">Scanning for Fraud...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzing login patterns, device IDs, IP addresses, tournament entries, and wallet activity.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admin Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setActionReason(""); }}>
        <DialogContent className="bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="font-rajdhani">
              {actionDialog?.type === "ban_user" && "🚫 Ban User"}
              {actionDialog?.type === "suspend_user" && "👁️ Suspend User (Shadow Ban)"}
              {actionDialog?.type === "flag_user" && "🚩 Flag for Review"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-rajdhani">
              {actionDialog?.type === "ban_user" && "This will ban the user from the platform. They will be unable to log in."}
              {actionDialog?.type === "suspend_user" && "This will shadow ban the user. They can still log in but their activity will be restricted."}
              {actionDialog?.type === "flag_user" && "This will flag the user for review in the suspicious activity log."}
            </p>
            <Textarea
              placeholder="Reason for action..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="font-rajdhani bg-background/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setActionReason(""); }} className="font-rajdhani">
              Cancel
            </Button>
            <Button
              onClick={handleAdminAction}
              disabled={actionLoading}
              className={cn("font-rajdhani gap-2",
                actionDialog?.type === "ban_user" && "bg-destructive hover:bg-destructive/90",
                actionDialog?.type === "suspend_user" && "bg-neon-orange hover:bg-neon-orange/90",
                actionDialog?.type === "flag_user" && "bg-neon-cyan hover:bg-neon-cyan/90",
              )}
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
