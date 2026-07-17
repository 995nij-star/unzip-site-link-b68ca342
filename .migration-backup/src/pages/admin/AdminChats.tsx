import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, MessageSquare, User, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface ChatPartner {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  uid: string | null;
  conversation_id: string;
  message_count: number;
  last_message_at: string;
  last_message: string;
}

export default function AdminChats() {
  const [searchUid, setSearchUid] = useState("");
  const [searching, setSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<{ user_id: string; username: string | null; uid: string | null; avatar_url: string | null } | null>(null);
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteMessage = async (msgId: string) => {
    setDeletingId(msgId);
    try {
      const { error } = await supabase.from("direct_messages").delete().eq("id", msgId);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast({ title: "Deleted", description: "Message removed successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleSearch = async () => {
    if (!searchUid.trim()) return;
    setSearching(true);
    setTargetUser(null);
    setChatPartners([]);
    setSelectedConv(null);
    setMessages([]);

    try {
      // Find user by UID
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

      setTargetUser(profile);

      // Get all conversation IDs for this user
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", profile.user_id);

      if (!participations?.length) {
        setChatPartners([]);
        setSearching(false);
        return;
      }

      const convIds = participations.map(p => p.conversation_id);

      // For each conversation, find the other participant and message stats
      const partners: ChatPartner[] = [];

      for (const convId of convIds) {
        // Get other participant
        const { data: otherParticipants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", convId)
          .neq("user_id", profile.user_id);

        if (!otherParticipants?.[0]) continue;

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, uid")
          .eq("user_id", otherParticipants[0].user_id)
          .single();

        // Get message count
        const { count } = await supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convId);

        // Get last message
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1);

        partners.push({
          user_id: otherProfile?.user_id || otherParticipants[0].user_id,
          username: otherProfile?.username || null,
          avatar_url: otherProfile?.avatar_url || null,
          uid: otherProfile?.uid || null,
          conversation_id: convId,
          message_count: count || 0,
          last_message_at: lastMsg?.[0]?.created_at || "",
          last_message: lastMsg?.[0]?.content || "",
        });
      }

      // Sort by most recent
      partners.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      setChatPartners(partners);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to search chats", variant: "destructive" });
    }

    setSearching(false);
  };

  const viewConversation = async (convId: string) => {
    setSelectedConv(convId);
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    }
    setLoadingMessages(false);
  };

  return (
    <AdminLayout title="Chat Monitor" description="View user conversations by UID">
      {/* Search */}
      <div className="flex gap-3 mb-6">
        <CyberInput
          placeholder="Enter user UID (e.g. 1234567890)"
          value={searchUid}
          onChange={(e) => setSearchUid(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <CyberButton onClick={handleSearch} disabled={searching}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Search
        </CyberButton>
      </div>

      {/* Target User Info */}
      {targetUser && (
        <div className="premium-card rounded-xl p-4 mb-6 flex items-center gap-4">
          <Avatar className="w-12 h-12 border-2 border-primary/50">
            <AvatarImage src={targetUser.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-sm">
              {(targetUser.username || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-orbitron font-bold text-foreground">{targetUser.username || "Unknown"}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">UID: {targetUser.uid}</p>
          </div>
          <Badge className="ml-auto bg-secondary text-muted-foreground border-border">
            {chatPartners.length} conversation{chatPartners.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      {/* Chat Partners List & Messages */}
      {targetUser && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Partners List */}
          <div className="w-full lg:w-96 space-y-2">
            <h3 className="font-orbitron font-bold text-foreground text-sm mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-neon-cyan" /> Conversations
            </h3>
            {chatPartners.length === 0 ? (
              <p className="text-muted-foreground font-rajdhani text-sm py-4">No conversations found</p>
            ) : (
              chatPartners.map((partner) => (
                <button
                  key={partner.conversation_id}
                  onClick={() => viewConversation(partner.conversation_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedConv === partner.conversation_id
                      ? "bg-primary/10 border-primary/30"
                      : "premium-card hover:border-neon-cyan/30"
                  }`}
                >
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={partner.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                      {(partner.username || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-rajdhani font-semibold text-foreground text-sm truncate">{partner.username || "Unknown"}</p>
                      <span className="text-[10px] text-muted-foreground font-rajdhani shrink-0">
                        {partner.last_message_at ? format(new Date(partner.last_message_at), "MMM dd") : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-rajdhani truncate">{partner.last_message || "No messages"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-rajdhani">UID: {partner.uid}</span>
                      <Badge className="bg-secondary text-muted-foreground border-border text-[10px] px-1.5 py-0">{partner.message_count} msgs</Badge>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </div>

          {/* Messages View */}
          <div className="flex-1 premium-card rounded-xl border border-border overflow-hidden flex flex-col" style={{ minHeight: 400, maxHeight: "70vh" }}>
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground font-rajdhani">
                Select a conversation to view messages
              </div>
            ) : loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => {
                  const isByTarget = msg.sender_id === targetUser?.user_id;
                  return (
                    <div key={msg.id} className={`flex ${isByTarget ? "justify-end" : "justify-start"} group`}>
                      <div className="relative">
                        <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                          isByTarget
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary text-secondary-foreground rounded-bl-md"
                        }`}>
                          {msg.attachment_url && msg.attachment_type === "image" && (
                            <img src={msg.attachment_url} alt="attachment" className="max-w-xs rounded-t-2xl" />
                          )}
                          {msg.attachment_url && msg.attachment_type === "video" && (
                            <video src={msg.attachment_url} controls className="max-w-xs rounded-t-2xl" preload="metadata" />
                          )}
                          {msg.content && !(msg.attachment_url && (msg.content === "📷 Photo" || msg.content === "🎥 Video")) && (
                            <div className="px-4 py-2">
                              <p className="text-sm font-rajdhani break-words">{msg.content}</p>
                            </div>
                          )}
                          <div className="px-4 pb-1.5">
                            <p className={`text-[10px] ${isByTarget ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {format(new Date(msg.created_at), "MMM dd, HH:mm")}
                            </p>
                          </div>
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
                  );
                })}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground font-rajdhani py-8">No messages in this conversation</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron">Delete Message?</AlertDialogTitle>
            <AlertDialogDescription className="font-rajdhani">
              This will permanently delete this message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-rajdhani"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMessage(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
