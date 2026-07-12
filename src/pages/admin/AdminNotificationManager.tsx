import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CyberButton } from "@/components/ui/cyber-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Users, Filter, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type TargetAudience = "all" | "active_today" | "tournament_players" | "wallet_holders";

export default function AdminNotificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notifType, setNotifType] = useState("system");
  const [audience, setAudience] = useState<TargetAudience>("all");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; time: string } | null>(null);

  const audienceOptions = [
    { value: "all", label: "All Users", desc: "Every registered user", icon: Users },
    { value: "active_today", label: "Active Today", desc: "Users seen today", icon: CheckCircle2 },
    { value: "tournament_players", label: "Tournament Players", desc: "Users who joined a tournament", icon: Filter },
    { value: "wallet_holders", label: "Wallet Holders", desc: "Users with wallet balance > 0", icon: Filter },
  ];

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;
    setSending(true);

    try {
      let userIds: string[] = [];

      if (audience === "all") {
        const { data } = await supabase.from("profiles").select("user_id").neq("user_id", user.id).limit(5000);
        userIds = data?.map(p => p.user_id) || [];
      } else if (audience === "active_today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data } = await supabase.from("profiles").select("user_id").gte("last_seen", today.toISOString()).neq("user_id", user.id).limit(5000);
        userIds = data?.map(p => p.user_id) || [];
      } else if (audience === "tournament_players") {
        const { data } = await supabase.from("tournament_participants").select("user_id").limit(5000);
        const unique = [...new Set(data?.map(p => p.user_id).filter(id => id !== user.id) || [])];
        userIds = unique;
      } else if (audience === "wallet_holders") {
        const { data } = await supabase.from("wallets").select("user_id").gt("balance", 0).neq("user_id", user.id).limit(5000);
        userIds = data?.map(p => p.user_id) || [];
      }

      if (userIds.length === 0) {
        toast({ title: "No recipients", description: "No users match the selected audience.", variant: "destructive" });
        setSending(false);
        return;
      }

      const notifications = userIds.map(uid => ({
        user_id: uid,
        type: notifType,
        title: title.trim(),
        message: message.trim(),
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        await supabase.from("notifications").insert(notifications.slice(i, i + 100));
      }

      // Audit log
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "bulk_notification",
        target_type: "notification",
        details: { title, audience, recipient_count: userIds.length, type: notifType } as any,
      });

      setLastResult({ count: userIds.length, time: new Date().toLocaleTimeString() });
      toast({ title: "✅ Notifications Sent", description: `Sent to ${userIds.length} users.` });
      setTitle("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <AdminLayout title="Notification Manager" description="Send bulk notifications to targeted user groups">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-card/60 border-border/50 space-y-5">
            <h2 className="font-orbitron text-sm font-bold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Compose Notification
            </h2>

            <div className="space-y-2">
              <Label className="font-rajdhani">Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Tournament Alert!" className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <Label className="font-rajdhani">Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your notification message..." rows={4} className="bg-background/50" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-rajdhani">Type</Label>
                <Select value={notifType} onValueChange={setNotifType}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="tournament_update">Tournament Update</SelectItem>
                    <SelectItem value="wallet_topup">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-rajdhani">Target Audience</Label>
                <Select value={audience} onValueChange={v => setAudience(v as TargetAudience)}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {audienceOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CyberButton onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} className="w-full" size="lg">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Notification</>}
            </CyberButton>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 bg-card/60 border-border/50">
            <h3 className="font-orbitron text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-neon-cyan" /> AUDIENCE GUIDE
            </h3>
            <div className="space-y-3">
              {audienceOptions.map(o => (
                <div key={o.value} className="flex items-start gap-2">
                  <o.icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium font-rajdhani text-foreground">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {lastResult && (
            <Card className="p-5 bg-card/60 border-border/50 border-neon-green/30">
              <h3 className="font-orbitron text-xs font-bold text-neon-green mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> LAST SENT
              </h3>
              <p className="text-sm font-rajdhani text-foreground">{lastResult.count} recipients</p>
              <p className="text-xs text-muted-foreground">{lastResult.time}</p>
            </Card>
          )}

          <Card className="p-5 bg-card/60 border-border/50 border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              <div>
                <p className="text-xs font-bold text-destructive font-rajdhani">CAUTION</p>
                <p className="text-xs text-muted-foreground">Bulk notifications are sent immediately and cannot be undone.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
