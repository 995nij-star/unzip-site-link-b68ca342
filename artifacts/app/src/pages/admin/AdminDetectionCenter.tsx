import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDetection, DetectionEvent } from "@/hooks/useDetection";
import { CyberButton } from "@/components/ui/cyber-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Shield,
  AlertTriangle,
  Eye,
  Activity,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Ban,
  FileWarning,
  Heart,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const categoryConfig: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  security: { icon: Shield, label: "Security", color: "text-[hsl(var(--destructive))]", bgColor: "bg-[hsl(var(--destructive)/0.1)]" },
  fraud: { icon: Ban, label: "Fraud", color: "text-[hsl(var(--neon-orange))]", bgColor: "bg-[hsl(var(--neon-orange)/0.1)]" },
  content: { icon: FileWarning, label: "Content", color: "text-[hsl(var(--neon-purple))]", bgColor: "bg-[hsl(var(--neon-purple)/0.1)]" },
  health: { icon: Heart, label: "Health", color: "text-[hsl(var(--neon-cyan))]", bgColor: "bg-[hsl(var(--neon-cyan)/0.1)]" },
};

const severityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.3)]" },
  high: { label: "High", className: "bg-[hsl(var(--neon-orange)/0.2)] text-[hsl(var(--neon-orange))] border-[hsl(var(--neon-orange)/0.3)]" },
  medium: { label: "Medium", className: "bg-[hsl(var(--neon-gold)/0.2)] text-[hsl(var(--neon-gold))] border-[hsl(var(--neon-gold)/0.3)]" },
  low: { label: "Low", className: "bg-[hsl(var(--neon-cyan)/0.2)] text-[hsl(var(--neon-cyan))] border-[hsl(var(--neon-cyan)/0.3)]" },
};

function StatCard({ label, value, icon: Icon, color, bgColor }: { label: string; value: number; icon: any; color: string; bgColor: string }) {
  return (
    <div className={`p-4 rounded-xl border border-border/40 ${bgColor} backdrop-blur-sm`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className={`text-2xl font-orbitron font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onAction }: { event: DetectionEvent; onAction: (event: DetectionEvent, action: string) => void }) {
  const cat = categoryConfig[event.category] || categoryConfig.health;
  const sev = severityConfig[event.severity] || severityConfig.medium;
  const CatIcon = cat.icon;

  return (
    <div className="p-4 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg ${cat.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
            <CatIcon className={`w-4 h-4 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-sm font-rajdhani font-semibold text-foreground truncate">{event.title}</h4>
              <Badge className={sev.className + " text-[10px] px-1.5 py-0"}>{sev.label}</Badge>
              {event.source === "ai" && (
                <Badge className="bg-[hsl(var(--neon-blue)/0.15)] text-[hsl(var(--neon-blue))] border-[hsl(var(--neon-blue)/0.3)] text-[10px] px-1.5 py-0">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />AI
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-rajdhani mb-2">{event.description}</p>
            <p className="text-[10px] text-muted-foreground/70 font-rajdhani">
              {format(new Date(event.created_at), "MMM dd, HH:mm")}
              {event.auto_action_taken && (
                <span className="ml-2 text-[hsl(var(--neon-orange))]">Auto: {event.auto_action_taken}</span>
              )}
            </p>
          </div>
        </div>

        {event.status === "open" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <CyberButton size="sm" variant="ghost" onClick={() => onAction(event, "investigating")} className="h-7 px-2 text-xs">
              <Eye className="w-3 h-3" />
            </CyberButton>
            <CyberButton size="sm" variant="ghost" onClick={() => onAction(event, "resolved")} className="h-7 px-2 text-xs text-[hsl(var(--neon-green))]">
              <CheckCircle2 className="w-3 h-3" />
            </CyberButton>
            <CyberButton size="sm" variant="ghost" onClick={() => onAction(event, "dismissed")} className="h-7 px-2 text-xs text-muted-foreground">
              <XCircle className="w-3 h-3" />
            </CyberButton>
          </div>
        )}

        {event.status === "investigating" && (
          <Badge className="bg-[hsl(var(--neon-orange)/0.15)] text-[hsl(var(--neon-orange))] border-[hsl(var(--neon-orange)/0.3)] text-[10px]">
            Investigating
          </Badge>
        )}

        {(event.status === "resolved" || event.status === "dismissed") && (
          <Badge className="bg-[hsl(var(--neon-green)/0.15)] text-[hsl(var(--neon-green))] border-[hsl(var(--neon-green)/0.3)] text-[10px]">
            {event.status === "resolved" ? "Resolved" : "Dismissed"}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function AdminDetectionCenter() {
  const { events, isLoading, stats, runScan, resolveEvent } = useDetection();
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [resolveDialog, setResolveDialog] = useState<{ event: DetectionEvent; action: string } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const filteredEvents = events.filter((e) => {
    const catMatch = filter === "all" || e.category === filter;
    const statusMatch = statusFilter === "all" || e.status === statusFilter;
    return catMatch && statusMatch;
  });

  const handleAction = (event: DetectionEvent, action: string) => {
    if (action === "resolved" || action === "dismissed") {
      setResolveDialog({ event, action });
      setResolveNotes("");
    } else {
      resolveEvent.mutate({ eventId: event.id, status: action });
    }
  };

  const confirmResolve = () => {
    if (resolveDialog) {
      resolveEvent.mutate({
        eventId: resolveDialog.event.id,
        status: resolveDialog.action,
        notes: resolveNotes,
      });
      setResolveDialog(null);
    }
  };

  return (
    <AdminLayout title="Arjun Era Detection" description="AI-powered threat & anomaly detection">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-blue)/0.2)] to-[hsl(var(--neon-purple)/0.2)] border border-[hsl(var(--neon-blue)/0.3)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[hsl(var(--neon-blue))]" />
            </div>
            <div>
              <h1 className="text-xl font-orbitron font-bold text-foreground">Arjun Era Detection</h1>
              <p className="text-xs text-muted-foreground font-rajdhani">AI-powered threat & anomaly detection</p>
            </div>
          </div>

          <CyberButton
            onClick={() => runScan.mutate("full")}
            disabled={runScan.isPending}
            className="gap-2"
          >
            {runScan.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {runScan.isPending ? "Scanning..." : "Run Scan"}
          </CyberButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Open Threats" value={stats.open} icon={AlertTriangle} color="text-[hsl(var(--destructive))]" bgColor="bg-[hsl(var(--destructive)/0.05)]" />
          <StatCard label="Critical" value={stats.critical} icon={Shield} color="text-[hsl(var(--neon-orange))]" bgColor="bg-[hsl(var(--neon-orange)/0.05)]" />
          <StatCard label="Security" value={stats.byCategory.security} icon={Shield} color="text-[hsl(var(--neon-pink))]" bgColor="bg-[hsl(var(--neon-pink)/0.05)]" />
          <StatCard label="Fraud" value={stats.byCategory.fraud} icon={Ban} color="text-[hsl(var(--neon-purple))]" bgColor="bg-[hsl(var(--neon-purple)/0.05)]" />
        </div>

        {/* Category Quick Scan */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => runScan.mutate(key)}
                disabled={runScan.isPending}
                className={`p-3 rounded-xl border border-border/40 ${config.bgColor} hover:opacity-80 transition-all text-left`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-rajdhani font-semibold text-foreground">{config.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-rajdhani">Scan {config.label.toLowerCase()} threats</p>
              </button>
            );
          })}
        </div>

        {/* Events List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-orbitron font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-[hsl(var(--neon-cyan))]" />
              Detection Events
            </h2>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-rajdhani">No detection events found</p>
              <p className="text-xs text-muted-foreground/60 font-rajdhani mt-1">Run a scan to detect threats</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} onAction={handleAction} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">
              {resolveDialog?.action === "resolved" ? "Resolve" : "Dismiss"} Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-rajdhani">
              {resolveDialog?.event.title}
            </p>
            <Textarea
              placeholder="Add notes (optional)..."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <CyberButton variant="ghost" onClick={() => setResolveDialog(null)}>Cancel</CyberButton>
            <CyberButton onClick={confirmResolve}>Confirm</CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
