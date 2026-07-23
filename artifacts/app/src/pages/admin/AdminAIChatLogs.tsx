import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Bot, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface AIChatUser {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  uid: string | null;
  message_count: number;
  last_message_at: string;
}

export default function AdminAIChatLogs() {
  const [searchUid, setSearchUid] = useState("");
  const [searching, setSearching] = useState(false);
  const [users, setUsers] = useState<AIChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AIChatUser | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmUserId, setClearConfirmUserId] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  // Load all users who have AI chat history
  const loadAllUsers = async () => {
    setLoadingAll(true);
    setSearchUid("");
    try {
      // Get distinct user_ids with counts
      const { data: chatData } = await supabase
        .from("ai_chat_messages")
        .select("user_id, created_at")
        .order("created_at", { ascending: false });

      if (!chatData?.length) {
        setUsers([]);
        setLoadingAll(false);
        return;
      }

      // Aggregate by user
      const userMap = new Map<string, { count: number; lastAt: string }>();
      for (const row of chatData) {
        if (!row.user_id) continue;
        const existing = userMap.get(row.user_id);
        if (!existing) {
          userMap.set(row.user_id, { count: 1, lastAt: row.created_at });
        } else {
          existing.count++;
        }
      }

      const userIds = Array.from(userMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, uid")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const result: AIChatUser[] = userIds.map(uid => {
        const p = profileMap.get(uid) as any;
        const stats = userMap.get(uid)!;
        return {
          user_id: uid,
          username: p?.username || null,
          avatar_url: p?.avatar_url || null,
          uid: p?.uid || null,
          message_count: stats.count,
          last_message_at: stats.lastAt,
        };
      });

      result.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      setUsers(result);
    } catch {
      toast({ title: "Error", description: "Failed to load AI chat users", variant: "destructive" });
    }
    setLoadingAll(false);
  };

  const handleSearch = async () => {
    if (!searchUid.trim()) {
      loadAllUsers();
      return;
    }
    setSearching(true);
    setSelectedUser(null);
    setMessages([]);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username, uid, avatar_url")
        .eq("uid", searchUid.trim())
        .single();

      if (!profile) {
        toast({ title: "Not found", description: "No user found with that UID", variant: "destructive" });
        setSearching(false);
        return;
      }

      const { count } = await supabase
        .from("ai_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      const { data: lastMsg } = await supabase
        .from("ai_chat_messages")
        .select("created_at")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      setUsers([{
        user_id: profile.user_id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        uid: profile.uid,
        message_count: count || 0,
        last_message_at: lastMsg?.[0]?.created_at || "",
      }]);
    } catch {
      toast({ title: "Error", description: "Failed to search", variant: "destructive" });
    }
    setSearching(false);
  };

  const viewUserChat = async (user: AIChatUser) => {
    setSelectedUser(user);
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages(data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    }
    setLoadingMessages(false);
  };

  const deleteMessage = async (msgId: string) => {
    setDeletingId(msgId);
    try {
      const { error } = await supabase.from("ai_chat_messages").delete().eq("id", msgId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast({ title: "Deleted", description: "Message removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const clearUserChat = async (userId: string) => {
    try {
      const { error } = await supabase.from("ai_chat_messages").delete().eq("user_id", userId);
      if (error) throw error;
      setMessages([]);
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      setSelectedUser(null);
      toast({ title: "Cleared", description: "All AI chat messages deleted for this user" });
    } catch {
      toast({ title: "Error", description: "Failed to clear chat", variant: "destructive" });
    }
  };

  // Auto-load on mount
  useState(() => { loadAllUsers(); });

  return (
    <AdminLayout title="AI Chat Logs" description="View and manage user AI support conversations">
      {/* Search */}
      <div className="flex gap-3 mb-6">
        <CyberInput
          placeholder="Search by UID or leave empty for all"
          value={searchUid}
          onChange={(e) => setSearchUid(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <CyberButton onClick={handleSearch} disabled={searching || loadingAll}>
          {(searching || loadingAll) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Search
        </CyberButton>
      </div>

      {/* Users list & Messages */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Users List */}
        <div className="w-full lg:w-80 space-y-2">
          <h3 className="font-orbitron font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-neon-cyan" /> Users ({users.length})
          </h3>
          {users.length === 0 ? (
            <p className="text-muted-foreground font-rajdhani text-sm py-4">
              {loadingAll ? "Loading..." : "No AI chat history found"}
            </p>
          ) : (
            users.map((u) => (
              <button
                key={u.user_id}
                onClick={() => viewUserChat(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  selectedUser?.user_id === u.user_id
                    ? "bg-primary/10 border-primary/30"
                    : "premium-card hover:border-neon-cyan/30"
                }`}
              >
                <Avatar className="w-9 h-9 border border-border">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                    {(u.username || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-rajdhani font-semibold text-foreground text-sm truncate">{u.username || "Unknown"}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-rajdhani">UID: {u.uid}</span>
                    <Badge className="bg-secondary text-muted-foreground border-border text-[10px] px-1.5 py-0">{u.message_count} msgs</Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Messages View */}
        <div className="flex-1 premium-card rounded-xl border border-border overflow-hidden flex flex-col" style={{ minHeight: 400, maxHeight: "70vh" }}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground font-rajdhani flex-col gap-2">
              <Bot className="w-8 h-8 text-muted-foreground/50" />
              Select a user to view their AI chat history
            </div>
          ) : loadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-[10px]">
                      {(selectedUser.username || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-rajdhani font-semibold text-foreground text-sm">{selectedUser.username || "Unknown"}</span>
                  <Badge className="text-[10px]">{messages.length} messages</Badge>
                </div>
                <CyberButton variant="outline" size="sm" onClick={() => setClearConfirmUserId(selectedUser.user_id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear All
                </CyberButton>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
                    <div className="relative">
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      }`}>
                        <p className="text-sm font-rajdhani break-words whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {format(new Date(msg.created_at), "MMM dd, HH:mm")}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteConfirmId(msg.id)}
                        disabled={deletingId === msg.id}
                        className="absolute -top-2 -right-2 hidden group-hover:flex w-6 h-6 rounded-full bg-destructive text-destructive-foreground items-center justify-center hover:brightness-110 transition-all shadow-lg"
                        title="Delete message"
                      >
                        {deletingId === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground font-rajdhani py-8">No AI chat messages</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete single message confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron">Delete Message?</AlertDialogTitle>
            <AlertDialogDescription className="font-rajdhani">
              This will permanently delete this AI chat message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-rajdhani"
              onClick={() => { if (deleteConfirmId) { deleteMessage(deleteConfirmId); setDeleteConfirmId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all messages confirmation */}
      <AlertDialog open={!!clearConfirmUserId} onOpenChange={(open) => !open && setClearConfirmUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron">Clear All AI Chat?</AlertDialogTitle>
            <AlertDialogDescription className="font-rajdhani">
              This will permanently delete ALL AI chat messages for this user. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-rajdhani"
              onClick={() => { if (clearConfirmUserId) { clearUserChat(clearConfirmUserId); setClearConfirmUserId(null); } }}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
