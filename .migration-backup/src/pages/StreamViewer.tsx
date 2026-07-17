import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStream, useStreamActions } from "@/hooks/useStreams";
import { useContentModeration } from "@/hooks/useContentModeration";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Radio, MessageCircle, Eye, StopCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  // Twitch
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch) return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${window.location.hostname}`;
  return null;
}

const EMOJIS = ["🔥", "❤️", "👏", "😂", "💀", "🏆", "⚡", "🎮"];

export default function StreamViewer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { stream, messages, reactions, viewerCount, isLoading } = useStream(id || "");
  const { sendMessage, sendReaction, endStream } = useStreamActions();
  const [chatMsg, setChatMsg] = useState("");
  const { checkContent } = useContentModeration();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!chatMsg.trim() || !id) return;
    const isSafe = await checkContent(chatMsg.trim());
    if (!isSafe) return;
    try {
      await sendMessage.mutateAsync({ stream_id: id, message: chatMsg.trim() });
      setChatMsg("");
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!id) return;
    try {
      await sendReaction.mutateAsync({ stream_id: id, emoji });
    } catch { /* silent */ }
  };

  // Count reactions by emoji
  const reactionCounts: Record<string, number> = {};
  reactions.forEach((r: { emoji: string }) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground font-rajdhani text-lg">Stream not found</p>
        <Link to="/streams"><CyberButton variant="secondary"><ArrowLeft className="w-4 h-4 mr-2" /> Back</CyberButton></Link>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(stream.stream_url);
  const isStreamer = user?.id === stream.user_id;

  const handleEndStream = async () => {
    try {
      await endStream.mutateAsync(stream.id);
      toast({ title: "Stream ended", description: "Your stream has been ended." });
    } catch {
      toast({ title: "Error", description: "Failed to end stream", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/streams"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /></Link>
            <div className="flex items-center gap-2">
              {stream.is_live && <div className="w-2.5 h-2.5 bg-neon-red rounded-full animate-pulse" />}
              <h1 className="font-orbitron font-bold text-foreground text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                {stream.title}
              </h1>
            </div>
            {stream.is_live ? (
              <Badge className="bg-neon-red/20 text-neon-red border-neon-red/30 text-xs">LIVE</Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-border text-xs">Ended</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Live viewer count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border">
              <Eye className="w-4 h-4 text-neon-green" />
              <span className="text-sm font-orbitron font-bold text-foreground">{viewerCount}</span>
              <span className="text-xs text-muted-foreground font-rajdhani hidden sm:inline">watching</span>
            </div>
            {/* End stream button for streamer */}
            {isStreamer && stream.is_live && (
              <CyberButton variant="destructive" size="sm" onClick={handleEndStream} disabled={endStream.isPending}>
                <StopCircle className="w-4 h-4 mr-1" /> End Stream
              </CyberButton>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video Player */}
          <div className="flex-1">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title={stream.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground font-rajdhani">Unable to load stream</p>
                </div>
              )}
            </div>

            {/* Reactions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border hover:border-neon-cyan/30 transition-all text-sm"
                >
                  <span>{emoji}</span>
                  {reactionCounts[emoji] && (
                    <span className="text-xs text-muted-foreground font-rajdhani">{reactionCounts[emoji]}</span>
                  )}
                </button>
              ))}
            </div>

            {stream.description && (
              <p className="mt-4 text-sm text-muted-foreground font-rajdhani">{stream.description}</p>
            )}
          </div>

          {/* Live Chat */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col premium-card rounded-xl border border-border overflow-hidden" style={{ height: "calc(100vh - 160px)", minHeight: 400 }}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-neon-cyan" />
              <span className="font-orbitron font-bold text-foreground text-sm">Live Chat</span>
              <Badge className="ml-auto bg-secondary text-muted-foreground border-border text-xs">{messages.length}</Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground font-rajdhani text-sm py-8">No messages yet. Say hi! 👋</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2 text-sm">
                    <span className="font-rajdhani font-semibold text-neon-cyan shrink-0">
                      {msg.profiles?.username || "User"}
                    </span>
                    <span className="text-foreground font-rajdhani break-all">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            {user ? (
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-rajdhani focus:outline-none focus:border-neon-cyan/50"
                  maxLength={300}
                />
                <CyberButton size="icon" onClick={handleSend} disabled={!chatMsg.trim()}>
                  <Send className="w-4 h-4" />
                </CyberButton>
              </div>
            ) : (
              <div className="p-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground font-rajdhani">
                  <Link to="/login" className="text-neon-cyan hover:underline">Sign in</Link> to chat
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
