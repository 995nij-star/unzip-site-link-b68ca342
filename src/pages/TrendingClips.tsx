import { useState } from "react";
import { useTrendingClips, useClipActions, useClipComments } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import { useContentModeration } from "@/hooks/useContentModeration";
import { Link } from "react-router-dom";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CyberButton } from "@/components/ui/cyber-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Heart, MessageCircle, Share2, Film, TrendingUp, Eye, Flag, Send
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ReportClipDialog } from "@/components/clips/ReportClipDialog";

export default function TrendingClips() {
  const { clips, isLoading } = useTrendingClips();
  const { toggleLike, addComment } = useClipActions();
  const { user } = useAuth();
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const { checkContent } = useContentModeration();
  const [reportClipId, setReportClipId] = useState<string | null>(null);

  const handleLike = async (clipId: string, isLiked: boolean) => {
    try { await toggleLike.mutateAsync({ clipId, isLiked }); } catch {}
  };

  const handleComment = async (clipId: string) => {
    if (!commentText.trim()) return;
    const isSafe = await checkContent(commentText.trim());
    if (!isSafe) return;
    try {
      await addComment.mutateAsync({ clipId, content: commentText.trim() });
      setCommentText("");
    } catch {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/clips"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <TrendingUp className="w-6 h-6 text-destructive" />
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Trending</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/clips/reels">
              <CyberButton size="sm" variant="outline">
                <Film className="w-4 h-4 mr-1" /> Reels
              </CyberButton>
            </Link>
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16 premium-card rounded-2xl">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground font-rajdhani">No trending clips yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {clips.map((clip, idx) => (
              <div key={clip.id} className="premium-card rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-orbitron font-bold text-primary">#{idx + 1}</span>
                  </div>
                  <Link to={`/creator/${clip.user_id}`}>
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage src={clip.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                        {(clip.profile?.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <Link to={`/creator/${clip.user_id}`} className="font-rajdhani font-semibold text-foreground text-sm hover:text-primary transition-colors">
                      {clip.profile?.username || "User"}
                    </Link>
                    <p className="text-xs text-muted-foreground font-rajdhani">{format(new Date(clip.created_at), "MMM dd")}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-rajdhani">
                    <Eye className="w-3.5 h-3.5" /> {clip.views}
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <p className="font-orbitron font-bold text-foreground text-sm">{clip.title}</p>
                </div>

                <div className="relative bg-black">
                  <video src={clip.video_url} controls preload="metadata" className="w-full max-h-[500px] object-contain" playsInline />
                </div>

                <div className="p-4 flex items-center gap-4">
                  <button onClick={() => handleLike(clip.id, clip.is_liked)} className="flex items-center gap-1.5 text-sm font-rajdhani transition-colors">
                    <Heart className={`w-5 h-5 ${clip.is_liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    <span className={clip.is_liked ? "text-destructive" : "text-muted-foreground"}>{clip.likes_count}</span>
                  </button>
                  <button onClick={() => setSelectedClip(selectedClip === clip.id ? null : clip.id)} className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span>{clip.comments_count}</span>
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/c/${clip.short_code || clip.id}`;
                      if (navigator.share) { navigator.share({ title: clip.title, url }); }
                      else { navigator.clipboard.writeText(url); toast({ title: "Link copied!" }); }
                    }}
                    className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  {user && (
                    <button onClick={() => setReportClipId(clip.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-auto">
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {selectedClip === clip.id && (
                  <TrendingCommentsSection clipId={clip.id} commentText={commentText} setCommentText={setCommentText} onSubmit={() => handleComment(clip.id)} isSubmitting={addComment.isPending} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {reportClipId && <ReportClipDialog clipId={reportClipId} open={!!reportClipId} onOpenChange={(o) => !o && setReportClipId(null)} />}
    </div>
  );
}

function TrendingCommentsSection({ clipId, commentText, setCommentText, onSubmit, isSubmitting }: {
  clipId: string; commentText: string; setCommentText: (v: string) => void; onSubmit: () => void; isSubmitting: boolean;
}) {
  const { comments, isLoading } = useClipComments(clipId);
  const { user } = useAuth();

  return (
    <div className="border-t border-border px-4 py-3">
      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : comments.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="font-rajdhani font-semibold text-primary shrink-0">{c.username || "User"}</span>
              <span className="text-foreground font-rajdhani break-all">{c.content}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground font-rajdhani mb-3">No comments yet</p>
      )}
      {user && (
        <div className="flex gap-2">
          <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()} placeholder="Add a comment..." className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-rajdhani focus:outline-none focus:border-primary/50" maxLength={500} />
          <CyberButton size="icon" onClick={onSubmit} disabled={!commentText.trim() || isSubmitting}><Send className="w-4 h-4" /></CyberButton>
        </div>
      )}
    </div>
  );
}
