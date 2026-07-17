import { useState } from "react";
import { useFollowingClipsFeed, useClipActions, useClipComments } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CyberButton } from "@/components/ui/cyber-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/clips/VideoPlayer";
import { DiscoverCreators } from "@/components/clips/DiscoverCreators";
import {
  ArrowLeft, Loader2, Heart, MessageCircle, Play, Film, Share2, Eye, Send, Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CyberInput } from "@/components/ui/cyber-input";
import type { GamingClip } from "@/hooks/useClips";

export default function FollowingClips() {
  const { clips, isLoading } = useFollowingClipsFeed();
  const { toggleLike, addComment } = useClipActions();
  const { user } = useAuth();
  const [expandedClip, setExpandedClip] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const handleShare = (clip: GamingClip) => {
    const url = clip.short_code
      ? `${window.location.origin}/c/${clip.short_code}`
      : `${window.location.origin}/clip/${clip.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this clip with friends" });
  };

  const handleComment = (clipId: string) => {
    if (!newComment.trim()) return;
    addComment.mutate({ clipId, content: newComment.trim() });
    setNewComment("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/clips"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <Users className="w-5 h-5 text-primary" />
            <span className="text-lg font-orbitron font-bold text-foreground">Following</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/clips">
              <CyberButton size="sm" variant="outline">
                <Film className="w-4 h-4 mr-1" /> All Clips
              </CyberButton>
            </Link>
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <DiscoverCreators />
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16 premium-card rounded-2xl">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground font-rajdhani">No clips from followed creators</p>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">Follow creators to see their clips here!</p>
            <Link to="/clips">
              <CyberButton className="mt-4">
                <Film className="w-4 h-4 mr-2" /> Browse Clips
              </CyberButton>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {clips.map((clip) => (
              <div key={clip.id} className="premium-card rounded-2xl overflow-hidden">
                {/* Clip header */}
                <div className="p-4 flex items-center gap-3">
                  <Link to={`/creator/${clip.user_id}`}>
                    <Avatar className="w-10 h-10 border border-primary/30">
                      <AvatarImage src={clip.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-sm">
                        {(clip.profile?.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/creator/${clip.user_id}`} className="text-sm font-orbitron font-bold text-foreground hover:text-primary transition-colors">
                      {clip.profile?.username || "User"}
                    </Link>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      {format(new Date(clip.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {clip.duration > 0 && (
                    <Badge variant="outline" className="text-xs border-primary/30">{clip.duration}s</Badge>
                  )}
                </div>

                {/* Title & description */}
                <div className="px-4 pb-2">
                  <h3 className="text-sm font-orbitron font-bold text-foreground">{clip.title}</h3>
                  {clip.description && (
                    <p className="text-xs text-muted-foreground font-rajdhani mt-1">{clip.description}</p>
                  )}
                </div>

                {/* Video */}
                <div className="relative bg-black">
                  <VideoPlayer src={clip.video_url} lazy={true} maxHeight="500px" />
                </div>

                {/* Actions */}
                <div className="p-4 flex items-center gap-4">
                  <button
                    onClick={() => toggleLike.mutate({ clipId: clip.id, isLiked: clip.is_liked })}
                    className="flex items-center gap-1.5 text-sm font-rajdhani transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${clip.is_liked ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
                    <span className="text-muted-foreground">{clip.likes_count}</span>
                  </button>
                  <button
                    onClick={() => setExpandedClip(expandedClip === clip.id ? null : clip.id)}
                    className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{clip.comments_count}</span>
                  </button>
                  <button onClick={() => handleShare(clip)} className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                  <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground font-rajdhani">
                    <Eye className="w-4 h-4" /> {clip.views}
                  </div>
                </div>

                {/* Comment input */}
                {expandedClip === clip.id && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <div className="flex gap-2">
                      <CyberInput
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleComment(clip.id)}
                        className="flex-1 text-sm"
                      />
                      <CyberButton size="sm" onClick={() => handleComment(clip.id)} disabled={!newComment.trim()}>
                        <Send className="w-4 h-4" />
                      </CyberButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
