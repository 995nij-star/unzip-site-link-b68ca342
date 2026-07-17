import { useState, useEffect, useRef } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, Trophy, Key, Play, CheckCircle, XCircle, X, Check, Trash2,
  Heart, UserPlus, Wallet, MessageSquare, Megaphone, TicketCheck,
  ArrowRight, Video
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const NOTIFICATION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  tournament_reminder: { icon: <Trophy className="w-4 h-4" />, color: "text-neon-gold", bg: "bg-neon-gold/15" },
  room_credentials: { icon: <Key className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15" },
  tournament_live: { icon: <Play className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15" },
  tournament_completed: { icon: <CheckCircle className="w-4 h-4" />, color: "text-neon-blue", bg: "bg-neon-blue/15" },
  tournament_cancelled: { icon: <XCircle className="w-4 h-4" />, color: "text-neon-orange", bg: "bg-neon-orange/15" },
  announcement: { icon: <Megaphone className="w-4 h-4" />, color: "text-neon-cyan", bg: "bg-neon-cyan/15" },
  ticket_response: { icon: <TicketCheck className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15" },
  new_follower: { icon: <UserPlus className="w-4 h-4" />, color: "text-neon-purple", bg: "bg-neon-purple/15" },
  profile_like: { icon: <Heart className="w-4 h-4" />, color: "text-neon-pink", bg: "bg-neon-pink/15" },
  wallet_topup: { icon: <Wallet className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15" },
  wallet_rejected: { icon: <Wallet className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15" },
  withdrawal_approved: { icon: <Wallet className="w-4 h-4" />, color: "text-neon-green", bg: "bg-neon-green/15" },
  withdrawal_rejected: { icon: <Wallet className="w-4 h-4" />, color: "text-destructive", bg: "bg-destructive/15" },
  new_message: { icon: <MessageSquare className="w-4 h-4" />, color: "text-neon-blue", bg: "bg-neon-blue/15" },
  new_clip: { icon: <Video className="w-4 h-4" />, color: "text-neon-cyan", bg: "bg-neon-cyan/15" },
};

const getConfig = (type: string) => NOTIFICATION_CONFIG[type] || { icon: <Bell className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/15" };

function NotificationItem({ notification, onMarkAsRead, onDelete, onNavigate, index }: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (n: Notification) => void;
  index: number;
}) {
  const config = getConfig(notification.type);

  return (
    <div
      className={cn(
        "relative p-3 border-b border-border/30 cursor-pointer group transition-all duration-200",
        "hover:bg-primary/5 animate-fade-in",
        !notification.is_read && "bg-gradient-to-r from-primary/8 to-transparent"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => {
        if (!notification.is_read) onMarkAsRead(notification.id);
        onNavigate(notification);
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 p-2 rounded-lg", config.bg)}>
          <span className={config.color}>{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-semibold truncate",
              !notification.is_read ? "text-foreground" : "text-muted-foreground"
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium uppercase tracking-wider">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="flex-shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const prevUnread = useRef(unreadCount);

  // Play subtle sound on new notification
  useEffect(() => {
    if (unreadCount > prevUnread.current && prevUnread.current >= 0) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } catch {}
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  const handleNavigate = (n: Notification) => {
    setOpen(false);
    if (n.type === "new_message") navigate("/messages");
    else if (n.type === "new_follower" || n.type === "profile_like") navigate("/dashboard");
    else if (n.type === "wallet_topup" || n.type === "wallet_rejected" || n.type === "withdrawal_approved" || n.type === "withdrawal_rejected") navigate("/wallet");
    else if (n.type === "new_clip") navigate("/clips");
    else if (n.tournament_id) navigate("/tournaments");
    else if (n.type === "ticket_response") navigate("/help");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-primary/10 transition-all duration-200 focus:outline-none group">
          <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] flex items-center justify-center px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full shadow-lg shadow-destructive/40 animate-scale-in">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[360px] p-0 border-primary/20 shadow-2xl shadow-primary/10 backdrop-blur-2xl bg-card/98"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-foreground tracking-wide">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 px-2 text-xs text-muted-foreground hover:text-primary">
                  <Check className="w-3 h-3 mr-1" /> Read all
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[380px]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground/50 mt-1">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 8).map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={handleNavigate}
                index={i}
              />
            ))
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <button
            onClick={() => { setOpen(false); navigate("/notifications"); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-border/50 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            View all notifications <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
