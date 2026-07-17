import { useState } from "react";
import { useConversations } from "@/hooks/useMessages";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useMessageActions } from "@/hooks/useMessages";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, MessageSquare, Plus, Loader2, Search
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM dd");
}

export default function Messages() {
  const { conversations, isLoading } = useConversations();
  const { startConversation } = useMessageActions();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    const raw = searchQuery.trim();
    if (!raw) return;
    const { sanitizeSearchTerm } = await import("@/lib/searchSanitize");
    const safe = sanitizeSearchTerm(raw);
    if (!safe) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url, uid")
        .or(`username.ilike.%${safe}%,uid.eq.${safe}`)
        .neq("user_id", user?.id || "")
        .limit(10);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleStartChat = async (otherUserId: string) => {
    try {
      const convId = await startConversation.mutateAsync(otherUserId);
      setNewChatOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      navigate(`/messages/${convId}`);
    } catch {
      toast({ title: "Error", description: "Failed to start conversation", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/dashboard"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <MessageSquare className="w-6 h-6 text-neon-cyan" />
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Messages</span>
          </div>
          <div className="flex items-center gap-3">
            <CyberButton size="sm" onClick={() => setNewChatOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Chat
            </CyberButton>
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-neon-blue" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 premium-card rounded-2xl">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground font-rajdhani">No conversations yet</p>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">Start a chat with another player!</p>
            <CyberButton className="mt-4" onClick={() => setNewChatOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Chat
            </CyberButton>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 p-4 premium-card rounded-xl hover:border-neon-cyan/30 transition-all text-left"
              >
                <Avatar className="w-12 h-12 border-2 border-border">
                  <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-sm">
                    {(conv.other_user?.username || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-orbitron font-semibold text-foreground text-sm truncate flex items-center gap-1">
                      {conv.other_user?.username || "Unknown User"}
                      {conv.other_user?.is_verified && <VerifiedBadge />}
                    </p>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground font-rajdhani shrink-0">
                        {formatMsgTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground font-rajdhani truncate">
                      {conv.last_message ? (
                        conv.last_message.sender_id === user?.id
                          ? `You: ${conv.last_message.content}`
                          : conv.last_message.content
                      ) : "No messages yet"}
                    </p>
                    {conv.unread_count > 0 && (
                      <Badge className="bg-neon-cyan text-primary-foreground border-none text-xs ml-2 shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron">New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <CyberInput
                placeholder="Search by username or UID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <CyberButton onClick={handleSearch} disabled={searching} size="icon">
                <Search className="w-4 h-4" />
              </CyberButton>
            </div>

            {searching && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-neon-blue" /></div>}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => handleStartChat(p.user_id)}
                    disabled={startConversation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                        {(p.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-rajdhani font-semibold text-foreground text-sm">{p.username || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-rajdhani">UID: {p.uid}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-center text-sm text-muted-foreground font-rajdhani py-4">No users found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
