import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessageActions } from "@/hooks/useMessages";
import { Copy, Check, Ticket, Clock, Users, Share2, Search, Loader2, Send, Smartphone } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface UserGiftCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  used_count: number;
  expiry: string;
  is_active: boolean;
  created_at: string;
}

export function MyGiftCodes() {
  const { user } = useAuth();
  const { startConversation, sendMessage } = useMessageActions();
  const [codes, setCodes] = useState<UserGiftCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Share dialog state
  const [shareCode, setShareCode] = useState<UserGiftCode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCodes = async () => {
      const { data } = await (supabase as any)
        .from("gift_codes")
        .select("id, code, amount, max_uses, used_count, expiry, is_active, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (data) setCodes((data as any[]).map((c: any) => ({ ...c, amount: Number(c.amount) })));
      setLoading(false);
    };
    fetchCodes();
  }, [user]);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (expiry: string) => new Date(expiry) < new Date();

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

  const handleShareToUser = async (otherUserId: string) => {
    if (!shareCode) return;
    setSending(true);
    try {
      const convId = await startConversation.mutateAsync(otherUserId);
      await sendMessage.mutateAsync({
        conversationId: convId,
        content: `🎁 Here's a Play Store Gift Card for you!\n\nCode: ${shareCode.code}\nAmount: ₹${shareCode.amount}\n\nRedeem it in your Wallet!`,
      });
      toast({ title: "Gift card sent!", description: "The gift card was shared via message." });
      setShareCode(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      toast({ title: "Error", description: "Failed to send gift card", variant: "destructive" });
    }
    setSending(false);
  };

  if (loading || codes.length === 0) return null;

  return (
    <>
      <div className="relative p-6 rounded-2xl premium-card overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-neon-blue/10">
              <Smartphone className="w-5 h-5 text-neon-blue" />
            </div>
            <div>
              <h3 className="text-lg font-orbitron font-bold text-foreground">
                My Play Store Gift Cards
              </h3>
              <p className="text-xs text-muted-foreground font-rajdhani">
                Gift cards you've created · {codes.length} total
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {codes.map((gc) => {
              const expired = isExpired(gc.expiry);
              const fullyUsed = gc.used_count >= gc.max_uses;
              const inactive = !gc.is_active || expired || fullyUsed;

              return (
                <div
                  key={gc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    inactive
                      ? "border-muted/30 opacity-60"
                      : "border-neon-blue/20 hover:border-neon-blue/40"
                  } bg-background/30`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-sm text-foreground tracking-wider truncate">
                          {gc.code}
                        </code>
                        <CyberButton
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyCode(gc.id, gc.code)}
                        >
                          {copiedId === gc.id ? (
                            <Check className="w-3 h-3 text-neon-green" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </CyberButton>
                        {!inactive && (
                          <CyberButton
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={() => setShareCode(gc)}
                          >
                            <Share2 className="w-3 h-3 text-neon-cyan" />
                          </CyberButton>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-rajdhani flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {gc.used_count}/{gc.max_uses} used
                        </span>
                        <span className="text-xs text-muted-foreground font-rajdhani flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(gc.expiry), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-orbitron font-bold text-sm text-neon-green">
                      ₹{gc.amount}
                    </span>
                    {expired ? (
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">Expired</Badge>
                    ) : fullyUsed ? (
                      <Badge className="bg-muted/20 text-muted-foreground border-muted/30 text-[10px]">Used Up</Badge>
                    ) : (
                      <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 text-[10px]">Active</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share Gift Code Dialog */}
      <Dialog open={!!shareCode} onOpenChange={() => { setShareCode(null); setSearchQuery(""); setSearchResults([]); }}>
        <DialogContent className="premium-card border-neon-cyan/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-neon-cyan flex items-center gap-2">
              <Share2 className="w-5 h-5" /> Share Gift Card
            </DialogTitle>
            <DialogDescription className="font-rajdhani">
              Send <span className="font-mono font-bold text-foreground">{shareCode?.code}</span> (₹{shareCode?.amount}) to a player via message.
            </DialogDescription>
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
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </CyberButton>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => handleShareToUser(p.user_id)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                        {(p.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-rajdhani font-semibold text-foreground text-sm">{p.username || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-rajdhani">UID: {p.uid}</p>
                    </div>
                    <Send className="w-4 h-4 text-neon-cyan shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-center text-sm text-muted-foreground font-rajdhani py-4">No users found</p>
            )}

            {sending && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
