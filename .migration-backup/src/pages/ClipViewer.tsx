import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSingleClip, useClipActions, useClipComments } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import { useContentModeration } from "@/hooks/useContentModeration";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CyberButton } from "@/components/ui/cyber-button";
import { VideoPlayer } from "@/components/clips/VideoPlayer";
import { ArrowLeft, Heart, MessageCircle, Send, Loader2, Film, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ClipViewer() {
  const { id } = useParams<{ id: string }>();
  const { clip, isLoading } = useSingleClip(id || "");
  const { toggleLike, addComment } = useClipActions();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const { checkContent } = useContentModeration();
  const { comments, isLoading: commentsLoading } = useClipComments(id || "");

  const handleLike = async () => {
    if (!clip) return;
    try { await toggleLike.mutateAsync({ clipId: clip.id, isLiked: clip.is_liked }); } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim() || !clip) return;
    const isSafe = await checkContent(commentText.trim());
    if (!isSafe) return;
    try {
      await addComment.mutateAsync({ clipId: clip.id, content: commentText.trim() });
      setCommentText("");
    } catch {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: clip?.title || "Gaming Clip", url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Clip link copied to clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Film className="w-16 h-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground font-rajdhani">Clip not found</p>
        <Link to="/clips">
          <CyberButton><ArrowLeft className="w-4 h-4 mr-2" /> Back to Clips</CyberButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/clips"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <Film className="w-5 h-5 text-primary" />
          <span className="text-lg font-orbitron font-bold text-foreground truncate">{clip.title}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="premium-card rounded-2xl overflow-hidden">
          {/* Author */}
          <div className="flex items-center gap-3 p-4 pb-2">
            <Avatar className="w-10 h-10 border border-border">
              <AvatarImage src={clip.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                {(clip.profile?.username || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-rajdhani font-semibold text-foreground">{clip.profile?.username || "User"}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">{format(new Date(clip.created_at), "MMM dd, yyyy")}</p>
            </div>
            {clip.duration > 0 && (
              <Badge className="bg-secondary text-muted-foreground border-border text-xs">{clip.duration}s</Badge>
            )}
          </div>

          {/* Title & Description */}
          <div className="px-4 pb-2">
            <p className="font-orbitron font-bold text-foreground">{clip.title}</p>
            {clip.description && <p className="text-sm text-muted-foreground font-rajdhani mt-1">{clip.description}</p>}
          </div>

          {/* Video */}
          <div className="bg-black">
            <VideoPlayer src={clip.video_url} autoPlay maxHeight="70vh" />
          </div>

          {/* Actions */}
          <div className="p-4 flex items-center gap-4">
            <button onClick={handleLike} className="flex items-center gap-1.5 text-sm font-rajdhani transition-colors">
              <Heart className={`w-5 h-5 ${clip.is_liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
              <span className={clip.is_liked ? "text-destructive" : "text-muted-foreground"}>{clip.likes_count}</span>
            </button>
            <div className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground">
              <MessageCircle className="w-5 h-5" />
              <span>{clip.comments_count}</span>
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors ml-auto">
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>

          {/* Comments */}
          <div className="border-t border-border px-4 py-3">
            <p className="text-sm font-orbitron font-bold text-foreground mb-3">Comments</p>
            {commentsLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : comments.length > 0 ? (
              <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
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
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-rajdhani focus:outline-none focus:border-primary/50"
                  maxLength={500}
                />
                <CyberButton size="icon" onClick={handleComment} disabled={!commentText.trim() || addComment.isPending}>
                  <Send className="w-4 h-4" />
                </CyberButton>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
