import { useParams, Link } from "react-router-dom";
import { useUserClips, useClipActions } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import { useFollows } from "@/hooks/useFollows";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CyberButton } from "@/components/ui/cyber-button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VideoPlayer } from "@/components/clips/VideoPlayer";
import {
  ArrowLeft, Film, Loader2, Eye, Heart, Play, Users, UserPlus, UserMinus, Share2, Calendar, Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function CreatorProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { clips, isLoading: clipsLoading } = useUserClips(userId);
  const { toggleLike, deleteClip } = useClipActions();
  const { isFollowing, followerCount, followingCount, toggleFollow, canFollow, isMutating } = useFollows(userId);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["creator-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("username, avatar_url, uid, free_fire_uid, created_at, is_verified")
        .eq("user_id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const isLoading = clipsLoading || profileLoading;
  const totalViews = clips.reduce((sum, c) => sum + c.views, 0);
  const totalLikes = clips.reduce((sum, c) => sum + c.likes_count, 0);
  const isOwnProfile = user?.id === userId;

  const handleShare = (clip: any) => {
    const url = clip.short_code
      ? `${window.location.origin}/c/${clip.short_code}`
      : `${window.location.origin}/clip/${clip.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this clip with friends" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/clips"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <Film className="w-5 h-5 text-primary" />
          <span className="text-lg font-orbitron font-bold text-foreground">Creator Profile</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !profile ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-rajdhani">Creator not found</p>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="premium-card rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-20 h-20 border-2 border-primary">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xl">
                    {(profile.username || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-orbitron font-bold text-foreground">{profile.username || "User"}</h1>
                    {profile.is_verified && <VerifiedBadge size="md" />}
                  </div>
                  {profile.uid && <p className="text-xs text-muted-foreground font-rajdhani">UID: {profile.uid}</p>}
                  {profile.free_fire_uid && <p className="text-xs text-muted-foreground font-rajdhani">Free Fire UID: {profile.free_fire_uid}</p>}
                  {profile.created_at && (
                    <p className="text-xs text-muted-foreground font-rajdhani flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> Joined {format(new Date(profile.created_at), "MMM yyyy")}
                    </p>
                  )}
                </div>
              </div>

              {/* Follow button */}
              {canFollow && (
                <CyberButton
                  onClick={toggleFollow}
                  disabled={isMutating}
                  variant={isFollowing ? "outline" : "default"}
                  className="w-full mb-4 gap-2"
                >
                  {isFollowing ? (
                    <><UserMinus className="w-4 h-4" /> Unfollow</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Follow</>
                  )}
                </CyberButton>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <Play className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-orbitron font-bold text-foreground">{clips.length}</p>
                  <p className="text-[10px] text-muted-foreground font-rajdhani">Clips</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-orbitron font-bold text-foreground">{followerCount}</p>
                  <p className="text-[10px] text-muted-foreground font-rajdhani">Followers</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <Eye className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-orbitron font-bold text-foreground">{totalViews}</p>
                  <p className="text-[10px] text-muted-foreground font-rajdhani">Views</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <Heart className="w-4 h-4 text-destructive mx-auto mb-1" />
                  <p className="text-lg font-orbitron font-bold text-foreground">{totalLikes}</p>
                  <p className="text-[10px] text-muted-foreground font-rajdhani">Likes</p>
                </div>
              </div>
            </div>

            {/* Video Gallery */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-orbitron font-bold text-foreground flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" /> Videos ({clips.length})
              </h2>
            </div>

            {clips.length === 0 ? (
              <div className="text-center py-12 premium-card rounded-2xl">
                <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-rajdhani">No clips uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {clips.map((clip) => (
                  <div key={clip.id} className="premium-card rounded-xl overflow-hidden group">
                    <Link to={clip.short_code ? `/c/${clip.short_code}` : `/clip/${clip.id}`}>
                      <div className="relative aspect-[9/16] bg-black">
                        <video
                          src={clip.video_url}
                          preload="metadata"
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-xs font-orbitron font-bold text-white truncate">{clip.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-white/80">
                              <Heart className="w-3 h-3" /> {clip.likes_count}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-white/80">
                              <Eye className="w-3 h-3" /> {clip.views}
                            </span>
                          </div>
                          <p className="text-[9px] text-white/60 font-rajdhani mt-0.5">
                            {format(new Date(clip.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        {clip.duration > 0 && (
                          <Badge className="absolute top-2 right-2 bg-black/60 text-white border-0 text-[10px]">
                            {clip.duration}s
                          </Badge>
                        )}
                      </div>
                    </Link>
                    {/* Quick actions */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-card/80">
                      <button
                        onClick={() => toggleLike.mutate({ clipId: clip.id, isLiked: clip.is_liked })}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Heart className={`w-3.5 h-3.5 ${clip.is_liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                      </button>
                      <div className="flex items-center gap-2">
                        {isOwnProfile && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-orbitron">Delete Clip</AlertDialogTitle>
                                <AlertDialogDescription className="font-rajdhani">
                                  This will permanently delete "{clip.title}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-rajdhani"
                                  onClick={() => {
                                    deleteClip.mutate(clip.id, {
                                      onSuccess: () => toast({ title: "Clip deleted" }),
                                      onError: () => toast({ title: "Failed to delete clip", variant: "destructive" }),
                                    });
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <button onClick={() => handleShare(clip)}>
                          <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
