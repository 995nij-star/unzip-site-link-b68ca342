import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  ScanSearch, ShieldAlert, Database, Wrench, AlertTriangle,
  CheckCircle2, Info, Loader2, RefreshCw, Clock, Trophy,
  Wallet, Zap, ChevronDown, ChevronUp, WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";

interface Finding {
  id: string;
  category: "technical" | "database" | "security" | "payments" | "tournaments";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affected?: number;
  autoFixable?: boolean;
  fixAction?: string;
}

interface CategoryStatus {
  status: "ok" | "warning" | "critical";
  issues: number;
}

interface ScanResult {
  scanned_at: string;
  scan_duration_ms: number;
  total_findings: number;
  critical: number;
  warnings: number;
  info: number;
  auto_fixable: number;
  categories: Record<string, CategoryStatus>;
  findings: Finding[];
}

const categoryConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  technical: { icon: Wrench, label: "Technical Health", color: "text-neon-blue", bg: "from-neon-blue/20 to-neon-blue/5" },
  database: { icon: Database, label: "Database Health", color: "text-neon-orange", bg: "from-neon-orange/20 to-neon-orange/5" },
  security: { icon: ShieldAlert, label: "Security", color: "text-destructive", bg: "from-destructive/20 to-destructive/5" },
  payments: { icon: Wallet, label: "Payments & Wallet", color: "text-neon-green", bg: "from-neon-green/20 to-neon-green/5" },
  tournaments: { icon: Trophy, label: "Tournament System", color: "text-neon-gold", bg: "from-neon-gold/20 to-neon-gold/5" },
};

const severityConfig = {
  critical: { badge: "destructive" as const, label: "Critical", glow: "shadow-lg shadow-destructive/20" },
  warning: { badge: "default" as const, label: "Warning", glow: "shadow-lg shadow-neon-orange/10" },
  info: { badge: "secondary" as const, label: "Info", glow: "" },
};

const statusColors = {
  ok: "text-neon-green",
  warning: "text-neon-orange",
  critical: "text-destructive",
};

const statusLabels = {
  ok: "OK",
  warning: "Warning",
  critical: "Critical",
};

export default function AdminSiteScanner() {
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["critical"]));

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    setActiveFilter("all");
    try {
      const { data, error } = await supabase.functions.invoke("site-health-scan");
      if (error) throw error;
      setResult(data);
      // Auto-expand categories with issues
      const cats = new Set<string>();
      for (const [key, val] of Object.entries(data.categories as Record<string, CategoryStatus>)) {
        if (val.status !== "ok") cats.add(key);
      }
      if (cats.size === 0) cats.add("all");
      setExpandedCategories(cats);

      if (data.critical > 0) toast.error(`Scan complete: ${data.critical} critical issue(s) found`);
      else if (data.warnings > 0) toast.warning(`Scan complete: ${data.warnings} warning(s)`);
      else toast.success("Scan complete: All systems healthy!");
    } catch (err: any) {
      toast.error("Scan failed: " + (err.message || "Unknown error"));
    } finally {
      setScanning(false);
    }
  };

  const runAutoFix = async () => {
    if (!result) return;
    const fixActions = result.findings.filter((f) => f.autoFixable && f.fixAction).map((f) => f.fixAction!);
    if (fixActions.length === 0) {
      toast.info("No auto-fixable issues found.");
      return;
    }
    setFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke("site-health-scan", {
        body: { action: "auto_fix", fixActions },
      });
      if (error) throw error;
      const successful = (data.results || []).filter((r: any) => r.success).length;
      toast.success(`Auto-fix complete: ${successful}/${fixActions.length} issues resolved`);
      // Re-run scan
      await runScan();
    } catch (err: any) {
      toast.error("Auto-fix failed: " + (err.message || "Unknown error"));
    } finally {
      setFixing(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filtered = result?.findings.filter((f) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "critical") return f.severity === "critical";
    if (activeFilter === "warning") return f.severity === "warning";
    if (activeFilter === "fixable") return f.autoFixable;
    return f.category === activeFilter;
  }) || [];

  const healthScore = result
    ? Math.max(0, 100 - (result.critical * 20) - (result.warnings * 5) - (result.info * 1))
    : null;

  const healthColor = healthScore !== null
    ? healthScore >= 80 ? "text-neon-green" : healthScore >= 50 ? "text-neon-orange" : "text-destructive"
    : "";

  return (
    <AdminLayout title="Site Health Scanner" description="Comprehensive platform diagnostics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-orbitron font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center shadow-lg shadow-neon-cyan/20">
                <ScanSearch className="w-5 h-5 text-white" />
              </div>
              Site Health Scanner
            </h1>
            <p className="text-muted-foreground font-rajdhani mt-1">
              Full platform scan — Technical, Security, Database, Payments & Tournaments
            </p>
          </div>
          <div className="flex gap-2">
            {result && result.auto_fixable > 0 && (
              <Button
                onClick={runAutoFix}
                disabled={fixing || scanning}
                variant="outline"
                className="gap-2 font-rajdhani border-neon-green/40 text-neon-green hover:bg-neon-green/10"
              >
                {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Auto Fix ({result.auto_fixable})
              </Button>
            )}
            <Button
              onClick={runScan}
              disabled={scanning}
              className="gap-2 font-rajdhani bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {scanning ? "Scanning..." : "Scan Entire System"}
            </Button>
          </div>
        </div>

        {/* Health Score + Scan Info */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Health Score */}
            <Card className="bg-card/50 border-border/40 backdrop-blur-sm md:col-span-1">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <p className={`text-5xl font-orbitron font-bold ${healthColor}`}>{healthScore}</p>
                <p className="text-xs font-rajdhani text-muted-foreground uppercase tracking-wider mt-2">Health Score</p>
                <Progress value={healthScore!} className="mt-3 h-2" />
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card className="bg-card/50 border-border/40 backdrop-blur-sm md:col-span-2">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center cursor-pointer" onClick={() => setActiveFilter("all")}>
                    <p className="text-2xl font-orbitron font-bold text-foreground">{result.total_findings}</p>
                    <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider">Total</p>
                  </div>
                  <div className="text-center cursor-pointer" onClick={() => setActiveFilter("critical")}>
                    <p className="text-2xl font-orbitron font-bold text-destructive">{result.critical}</p>
                    <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider">Critical</p>
                  </div>
                  <div className="text-center cursor-pointer" onClick={() => setActiveFilter("warning")}>
                    <p className="text-2xl font-orbitron font-bold text-neon-orange">{result.warnings}</p>
                    <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider">Warnings</p>
                  </div>
                  <div className="text-center cursor-pointer" onClick={() => setActiveFilter("fixable")}>
                    <p className="text-2xl font-orbitron font-bold text-neon-green">{result.auto_fixable}</p>
                    <p className="text-[10px] font-rajdhani text-muted-foreground uppercase tracking-wider">Auto-Fixable</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground font-rajdhani border-t border-border/30 pt-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(result.scanned_at).toLocaleString()}
                  </div>
                  <div>Scan took {(result.scan_duration_ms / 1000).toFixed(1)}s</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Status Report */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const status = result.categories[key];
              const CatIcon = config.icon;
              return (
                <Card
                  key={key}
                  className={`bg-gradient-to-b ${config.bg} border-border/40 backdrop-blur-sm cursor-pointer hover:border-border/60 transition-all`}
                  onClick={() => setActiveFilter(key)}
                >
                  <CardContent className="p-4 text-center">
                    <CatIcon className={`w-6 h-6 mx-auto mb-2 ${config.color}`} />
                    <p className="text-xs font-rajdhani font-semibold text-foreground truncate">{config.label}</p>
                    <p className={`text-sm font-orbitron font-bold mt-1 ${statusColors[status?.status || "ok"]}`}>
                      {statusLabels[status?.status || "ok"]}
                    </p>
                    {status?.issues > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{status.issues} issue(s)</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filter Chips */}
        {result && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "critical", label: `Critical (${result.critical})` },
              { key: "warning", label: `Warnings (${result.warnings})` },
              { key: "fixable", label: `Auto-Fixable (${result.auto_fixable})` },
              ...Object.entries(categoryConfig).map(([k, v]) => ({ key: k, label: v.label })),
            ].map((f) => (
              <Button
                key={f.key}
                variant={activeFilter === f.key ? "default" : "outline"}
                size="sm"
                className="font-rajdhani text-xs"
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}

        {/* Findings grouped by category */}
        {result && filtered.length > 0 && (
          <div className="space-y-4">
            {Object.entries(categoryConfig).map(([catKey, catConfig]) => {
              const catFindings = filtered.filter((f) => f.category === catKey);
              if (catFindings.length === 0) return null;
              const CatIcon = catConfig.icon;
              const isExpanded = expandedCategories.has(catKey);
              return (
                <div key={catKey}>
                  <button
                    onClick={() => toggleCategory(catKey)}
                    className="flex items-center gap-3 w-full text-left py-2 px-1 group"
                  >
                    <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
                    <span className="font-rajdhani font-semibold text-sm text-foreground flex-1">
                      {catConfig.label} ({catFindings.length})
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 ml-7">
                      {catFindings.map((finding) => {
                        const sev = severityConfig[finding.severity];
                        return (
                          <Card key={finding.id} className={`bg-card/50 border-border/40 backdrop-blur-sm hover:border-border/60 transition-all ${sev.glow}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-rajdhani font-semibold text-foreground text-sm">{finding.title}</h3>
                                    <Badge variant={sev.badge} className="text-[10px] uppercase tracking-wider">
                                      {sev.label}
                                    </Badge>
                                    {finding.autoFixable && (
                                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-neon-green border-neon-green/40">
                                        <WrenchIcon className="w-2.5 h-2.5 mr-1" />
                                        Auto-Fix
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground font-rajdhani mt-1">{finding.description}</p>
                                </div>
                                {finding.affected !== undefined && (
                                  <div className="text-right shrink-0">
                                    <p className="text-xl font-orbitron font-bold text-foreground">{finding.affected}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">affected</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* All Clear */}
        {result && filtered.length === 0 && (
          <Card className="bg-card/50 border-neon-green/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-3" />
              <p className="text-lg font-rajdhani font-semibold text-foreground">All Clear!</p>
              <p className="text-sm text-muted-foreground">No issues found in this category.</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!result && !scanning && (
          <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <ScanSearch className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-rajdhani font-semibold text-foreground">Ready to Scan</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                Click "Scan Entire System" to run a comprehensive check across Technical Health, Security,
                Database Integrity, Payments & Wallets, and Tournament Systems.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 max-w-2xl mx-auto">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const CatIcon = config.icon;
                  return (
                    <div key={key} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.02] border border-border/30">
                      <CatIcon className={`w-5 h-5 ${config.color}`} />
                      <span className="text-[10px] font-rajdhani text-muted-foreground text-center">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scanning State */}
        {scanning && (
          <Card className="bg-card/50 border-primary/30 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <Loader2 className="w-20 h-20 text-primary animate-spin absolute inset-0" />
                <ScanSearch className="w-8 h-8 text-primary/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-rajdhani font-semibold text-foreground">Scanning Entire Platform...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Checking technical health, security, database, payments, and tournament systems.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <Badge key={key} variant="outline" className="text-[10px] animate-pulse">
                    {config.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
