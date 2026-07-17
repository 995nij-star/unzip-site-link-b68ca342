import { useState } from "react";
import { useClipsFeed, useClipActions, useClipComments } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import { useContentModeration } from "@/hooks/useContentModeration";
import { useVideoSettings, validateVideoFile } from "@/hooks/useVideoSettings";
import { useNavigate, Link } from "react-router-dom";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/clips/VideoPlayer";
import {
  ArrowLeft, Plus, Loader2, Heart, MessageCircle, Play, Upload, X, Send, Film, Share2, TrendingUp, Smartphone, Flag, Users, Search
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Clips() {
  const { clips, isLoading } = useClipsFeed();
  const { uploadClip, toggleLike, addComment } = useClipActions();
  const { user } = useAuth();
  const { settings: videoSettings } = useVideoSettings();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [form, setForm] = useState({ title: "", description: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { checkContent } = useContentModeration();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validation = validateVideoFile(file, videoSettings);
    if (!validation.valid) {
      toast({ title: "Invalid file", description: validation.error, variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!form.title.trim() || !selectedFile) {
      toast({ title: "Missing info", description: "Title and video are required", variant: "destructive" });
      return;
    }
    // Moderate title and description
    const titleSafe = await checkContent(form.title);
    if (!titleSafe) return;
    if (form.description) {
      const descSafe = await checkContent(form.description);
      if (!descSafe) return;
    }
    try {
      await uploadClip.mutateAsync({ title: form.title, description: form.description, file: selectedFile });
      setUploadOpen(false);
      setForm({ title: "", description: "" });
      setSelectedFile(null);
      toast({ title: "Clip uploaded!", description: "Your gaming clip is now live." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload clip", variant: "destructive" });
    }
  };

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
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/dashboard"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <Film className="w-6 h-6 text-neon-pink" />
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Clips</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/clips/trending">
              <CyberButton size="sm" variant="outline">
                <TrendingUp className="w-4 h-4 mr-1" /> Trending
              </CyberButton>
            </Link>
            <Link to="/clips/following">
              <CyberButton size="sm" variant="outline">
                <Users className="w-4 h-4 mr-1" /> Following
              </CyberButton>
            </Link>
            <Link to="/discover">
              <CyberButton size="sm" variant="outline">
                <Search className="w-4 h-4 mr-1" /> Discover
              </CyberButton>
            </Link>
            <Link to="/clips/reels">
              <CyberButton size="sm" variant="outline">
                <Smartphone className="w-4 h-4 mr-1" /> Reels
              </CyberButton>
            </Link>
            <CyberButton size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-1" /> Upload
            </CyberButton>
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-neon-blue" /></div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16 premium-card rounded-2xl">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground font-rajdhani">No clips yet</p>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">Be the first to share a gaming clip!</p>
            <CyberButton className="mt-4" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload Clip
            </CyberButton>
          </div>
        ) : (
          <div className="space-y-6">
            {clips.map((clip) => (
              <div key={clip.id} className="premium-card rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 pb-2">
                  <Link to={`/creator/${clip.user_id}`}>
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage src={clip.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
                        {(clip.profile?.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <Link to={`/creator/${clip.user_id}`} className="font-rajdhani font-semibold text-foreground text-sm hover:text-primary transition-colors">{clip.profile?.username || "User"}</Link>
                    <p className="text-xs text-muted-foreground font-rajdhani">{format(new Date(clip.created_at), "MMM dd, yyyy")}</p>
                  </div>
                  {clip.duration > 0 && (
                    <Badge className="bg-secondary text-muted-foreground border-border text-xs">
                      {clip.duration}s
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <div className="px-4 pb-2">
                  <p className="font-orbitron font-bold text-foreground text-sm">{clip.title}</p>
                  {clip.description && (
                    <p className="text-xs text-muted-foreground font-rajdhani mt-1">{clip.description}</p>
                  )}
                </div>

                {/* Video */}
                <div className="relative bg-black">
                  <VideoPlayer
                    src={clip.video_url}
                    lazy={true}
                    maxHeight="500px"
                  />
                </div>

                {/* Actions */}
                <div className="p-4 flex items-center gap-4">
                  <button
                    onClick={() => handleLike(clip.id, clip.is_liked)}
                    className="flex items-center gap-1.5 text-sm font-rajdhani transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${clip.is_liked ? "fill-neon-red text-neon-red" : "text-muted-foreground"}`} />
                    <span className={clip.is_liked ? "text-neon-red" : "text-muted-foreground"}>{clip.likes_count}</span>
                  </button>
                  <button
                    onClick={() => setSelectedClip(selectedClip === clip.id ? null : clip.id)}
                    className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{clip.comments_count}</span>
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/c/${clip.short_code || clip.id}`;
                      if (navigator.share) {
                        navigator.share({ title: clip.title, url });
                      } else {
                        navigator.clipboard.writeText(url);
                        toast({ title: "Link copied!", description: "Short link copied to clipboard." });
                      }
                    }}
                    className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                  {user && (
                    <button
                      onClick={() => {
                        const reason = prompt("Why are you reporting this clip?");
                        if (reason) {
                          // Use inline report
                          import("@/integrations/supabase/client").then(({ supabase }) => {
                            supabase.from("clip_reports" as any).insert({
                              clip_id: clip.id,
                              reporter_id: user.id,
                              reason,
                            }).then(({ error }) => {
                              if (error) {
                                if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
                                  toast({ title: "Already reported", variant: "destructive" });
                                } else {
                                  toast({ title: "Error reporting clip", variant: "destructive" });
                                }
                              } else {
                                toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
                              }
                            });
                          });
                        }
                      }}
                      className="flex items-center gap-1.5 text-sm font-rajdhani text-muted-foreground hover:text-destructive transition-colors ml-auto"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Comments */}
                {selectedClip === clip.id && (
                  <ClipCommentsSection
                    clipId={clip.id}
                    commentText={commentText}
                    setCommentText={setCommentText}
                    onSubmit={() => handleComment(clip.id)}
                    isSubmitting={addComment.isPending}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Upload Gaming Clip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <CyberInput
              placeholder="Clip title"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <CyberInput
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
                <Play className="w-5 h-5 text-neon-green" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-rajdhani text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground font-rajdhani">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={() => setSelectedFile(null)}>
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed border-border hover:border-neon-cyan/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-rajdhani">
                  MP4, MOV, WebM • Max {videoSettings.maxDurationSeconds}s • {videoSettings.maxFileSizeMB}MB
                  {videoSettings.allow4K ? " • Up to 4K" : " • Max 1080p"}
                </p>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleFileSelect} />
              </label>
            )}

            <CyberButton onClick={handleUpload} className="w-full" disabled={uploadClip.isPending}>
              {uploadClip.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </CyberButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClipCommentsSection({
  clipId,
  commentText,
  setCommentText,
  onSubmit,
  isSubmitting,
}: {
  clipId: string;
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const { comments, isLoading } = useClipComments(clipId);
  const { user } = useAuth();

  return (
    <div className="border-t border-border px-4 py-3">
      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-neon-blue" /></div>
      ) : comments.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="font-rajdhani font-semibold text-neon-cyan shrink-0">{c.username || "User"}</span>
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
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="Add a comment..."
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-rajdhani focus:outline-none focus:border-neon-cyan/50"
            maxLength={500}
          />
          <CyberButton size="icon" onClick={onSubmit} disabled={!commentText.trim() || isSubmitting}>
            <Send className="w-4 h-4" />
          </CyberButton>
        </div>
      )}
    </div>
  );
}
