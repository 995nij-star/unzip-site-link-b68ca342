import { useState, useMemo } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, Trophy, Key, Play, CheckCircle, XCircle, X, Check, Trash2,
  Heart, UserPlus, Wallet, MessageSquare, Megaphone, TicketCheck,
  ArrowLeft, Filter, Video, Inbox
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

const NOTIFICATION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  tournament_reminder: { icon: <Trophy className="w-4 h-4" />, color: "text-neon-gold", bg: "bg-neon-gold/15", label: "Tournament" },
  room_credentials: { icon: <Key className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15", label: "Tournament" },
  tournament_live: { icon: <Play className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15", label: "Tournament" },
  tournament_completed: { icon: <CheckCircle className="w-4 h-4" />, color: "text-neon-blue", bg: "bg-neon-blue/15", label: "Tournament" },
  tournament_cancelled: { icon: <XCircle className="w-4 h-4" />, color: "text-neon-orange", bg: "bg-neon-orange/15", label: "Tournament" },
  announcement: { icon: <Megaphone className="w-4 h-4" />, color: "text-neon-cyan", bg: "bg-neon-cyan/15", label: "Announcement" },
  ticket_response: { icon: <TicketCheck className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15", label: "Support" },
  new_follower: { icon: <UserPlus className="w-4 h-4" />, color: "text-neon-purple", bg: "bg-neon-purple/15", label: "Social" },
  profile_like: { icon: <Heart className="w-4 h-4" />, color: "text-neon-pink", bg: "bg-neon-pink/15", label: "Social" },
  wallet_topup: { icon: <Wallet className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15", label: "Wallet" },
  wallet_rejected: { icon: <Wallet className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15", label: "Wallet" },
  withdrawal_approved: { icon: <Wallet className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15", label: "Wallet" },
  withdrawal_rejected: { icon: <Wallet className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15", label: "Wallet" },
  new_message: { icon: <MessageSquare className="w-4 h-4" />, color: "text-neon-blue", bg: "bg-neon-blue/15", label: "Message" },
  new_clip: { icon: <Video className="w-4 h-4" />, color: "text-neon-cyan", bg: "bg-neon-cyan/15", label: "Clip" },
};

const getConfig = (type: string) => NOTIFICATION_CONFIG[type] || { icon: <Bell className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/15", label: "General" };

type FilterCategory = "all" | "social" | "tournament" | "wallet" | "system";

const FILTER_TABS: { value: FilterCategory; label: string; types: string[] }[] = [
  { value: "all", label: "All", types: [] },
  { value: "social", label: "Social", types: ["new_follower", "profile_like", "new_message", "new_clip"] },
  { value: "tournament", label: "Tournaments", types: ["tournament_reminder", "room_credentials", "tournament_live", "tournament_completed", "tournament_cancelled"] },
  { value: "wallet", label: "Wallet", types: ["wallet_topup", "wallet_rejected", "withdrawal_approved", "withdrawal_rejected"] },
  { value: "system", label: "System", types: ["announcement", "ticket_response"] },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = notifications;
    if (filter !== "all") {
      const types = FILTER_TABS.find(t => t.value === filter)?.types || [];
      list = list.filter(n => types.includes(n.type));
    }
    if (showUnreadOnly) list = list.filter(n => !n.is_read);
    return list;
  }, [notifications, filter, showUnreadOnly]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of filtered) {
      const date = new Date(n.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let key: string;
      if (date.toDateString() === today.toDateString()) key = "Today";
      else if (date.toDateString() === yesterday.toDateString()) key = "Yesterday";
      else key = format(date, "MMM d, yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    }
    return groups;
  }, [filtered]);

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.type === "new_message") navigate("/messages");
    else if (n.type === "new_follower" || n.type === "profile_like") navigate("/dashboard");
    else if (n.type.includes("wallet") || n.type.includes("withdrawal")) navigate("/wallet");
    else if (n.type === "new_clip") navigate("/clips");
    else if (n.tournament_id) navigate("/tournaments");
    else if (n.type === "ticket_response") navigate("/help");
  };

  const totalCount = notifications.length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-primary/20 blur-[120px] opacity-60" />
        <div className="absolute -top-20 right-0 w-[320px] h-[320px] rounded-full bg-neon-purple/20 blur-[100px] opacity-50" />
        <div className="absolute top-10 left-0 w-[280px] h-[280px] rounded-full bg-neon-cyan/15 blur-[100px] opacity-50" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-xl bg-muted/40 hover:bg-muted border border-border/40"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-orbitron font-bold text-lg bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Inbox
                </h1>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  {totalCount === 0 ? "All caught up" : `${totalCount} total · ${unreadCount} unread`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PushNotificationToggle />
            </div>
          </div>

          {/* Hero stat card */}
          <div className="relative mt-4 rounded-2xl p-[1px] bg-gradient-to-br from-primary/40 via-neon-purple/30 to-neon-cyan/40">
            <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-neon-cyan/5" />
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center shadow-lg shadow-primary/30">
                    <Bell className="w-5 h-5 text-primary-foreground" />
                  </div>
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive/60 animate-ping" />
                    </>
                  )}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-foreground">
                    {unreadCount > 0 ? `${unreadCount} new update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {unreadCount > 0 ? "Tap to view your latest activity" : "Check back soon for new alerts"}
                  </p>
                </div>
              </div>
              <div className="relative flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-8 px-2.5 gap-1 text-[11px] font-semibold rounded-lg bg-primary/15 text-primary hover:bg-primary/25"
                  >
                    <Check className="w-3.5 h-3.5" /> Read all
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-8 px-2 rounded-lg text-destructive hover:bg-destructive/15"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(tab => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                  active
                    ? "bg-gradient-to-r from-primary to-neon-purple text-primary-foreground border-transparent shadow-lg shadow-primary/30 scale-105"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground hover:border-border"
                )}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5",
              showUnreadOnly
                ? "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/50 shadow-md shadow-neon-cyan/20"
                : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
            )}
          >
            <Filter className="w-3 h-3" /> Unread
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-2xl mx-auto pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-primary border-r-neon-purple rounded-full animate-spin" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Loading your inbox…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 animate-fade-in">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-card to-muted/50 border border-border/50 flex items-center justify-center shadow-xl">
                <Inbox className="w-11 h-11 text-muted-foreground/40" strokeWidth={1.5} />
              </div>
            </div>
            <p className="font-orbitron font-bold text-foreground text-base">Nothing here yet</p>
            <p className="text-sm text-muted-foreground mt-1.5 text-center max-w-xs">
              {showUnreadOnly
                ? "Every notification has been read. Nice work staying on top of things."
                : "You'll see tournament alerts, wins and social activity here as it happens."}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-[164px] z-10 px-4 py-2 bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.15em]">{date}</p>
                  <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
                </div>
              </div>
              <div className="px-3 space-y-2">
                {items.map((n, i) => {
                  const config = getConfig(n.type);
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "relative rounded-2xl cursor-pointer group transition-all duration-300 animate-fade-in overflow-hidden",
                        "border backdrop-blur-sm",
                        !n.is_read
                          ? "bg-gradient-to-br from-primary/10 via-card/60 to-card/60 border-primary/30 shadow-lg shadow-primary/5 hover:shadow-primary/20"
                          : "bg-card/40 border-border/30 hover:bg-card/70 hover:border-border/60"
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => handleClick(n)}
                    >
                      {!n.is_read && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-primary to-neon-purple" />
                      )}
                      <div className="flex items-start gap-3 p-3 pl-4">
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "p-2.5 rounded-xl ring-1 ring-inset transition-transform group-hover:scale-110",
                            config.bg,
                            "ring-white/5"
                          )}>
                            <span className={config.color}>{config.icon}</span>
                          </div>
                          {!n.is_read && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background shadow-[0_0_8px_hsl(var(--primary))]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "text-sm font-semibold leading-snug",
                              !n.is_read ? "text-foreground" : "text-foreground/70"
                            )}>
                              {n.title}
                            </p>
                            <span className="flex-shrink-0 text-[10px] text-muted-foreground/70 font-medium mt-0.5">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
                            </span>
                          </div>
                          <p className="text-[13px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0 h-[18px] font-semibold border-0",
                                config.bg,
                                config.color
                              )}
                            >
                              {config.label}
                            </Badge>
                            {!n.is_read && (
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">• New</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          aria-label="Delete notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
