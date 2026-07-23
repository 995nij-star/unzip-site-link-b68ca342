import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFollows } from "@/hooks/useFollows";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CyberButton } from "@/components/ui/cyber-button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Loader2, UserPlus, Film, Heart, Sparkles } from "lucide-react";

interface Creator {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  clip_count: number;
  total_likes: number;
}

function FollowButton({ userId }: { userId: string }) {
  const { isFollowing, toggleFollow, isMutating, canFollow } = useFollows(userId);
  if (!canFollow) return null;
  return (
    <CyberButton
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={toggleFollow}
      disabled={isMutating}
      className="gap-1 text-xs"
    >
      <UserPlus className="w-3.5 h-3.5" />
      {isFollowing ? "Following" : "Follow"}
    </CyberButton>
  );
}

export function DiscoverCreators() {
  const { user } = useAuth();

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["discover-creators", user?.id],
    queryFn: async () => {
      // Get creators with clips, sorted by popularity
      const { data: clips } = await supabase
        .from("gaming_clips")
        .select("user_id");
      if (!clips) return [];

      // Count clips per user
      const clipCounts: Record<string, number> = {};
      clips.forEach((c) => {
        clipCounts[c.user_id] = (clipCounts[c.user_id] || 0) + 1;
      });

      const creatorIds = Object.keys(clipCounts);
      if (creatorIds.length === 0) return [];

      // Exclude self and already-followed
      let excludeIds: string[] = [];
      if (user) {
        excludeIds.push(user.id);
        const { data: follows } = await supabase
          .from("user_follows" as any)
          .select("following_id")
          .eq("follower_id", user.id);
        if (follows) excludeIds.push(...follows.map((f: any) => f.following_id));
      }

      const filteredIds = creatorIds.filter((id) => !excludeIds.includes(id));
      if (filteredIds.length === 0) return [];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url, is_verified")
        .in("user_id", filteredIds);
      if (!profiles) return [];

      // Get likes per creator
      const { data: likes } = await supabase
        .from("clip_likes")
        .select("clip_id");

      const { data: allClips } = await supabase
        .from("gaming_clips")
        .select("id, user_id")
        .in("user_id", filteredIds);

      const likesPerCreator: Record<string, number> = {};
      if (likes && allClips) {
        const clipOwner: Record<string, string> = {};
        allClips.forEach((c) => { clipOwner[c.id] = c.user_id; });
        likes.forEach((l) => {
          const owner = clipOwner[l.clip_id];
          if (owner) likesPerCreator[owner] = (likesPerCreator[owner] || 0) + 1;
        });
      }

      const result: Creator[] = profiles.filter((p) => p.user_id != null).map((p) => ({
        user_id: p.user_id!,
        username: p.username,
        avatar_url: p.avatar_url,
        is_verified: p.is_verified || false,
        clip_count: clipCounts[p.user_id!] || 0,
        total_likes: likesPerCreator[p.user_id!] || 0,
      }));

      // Sort by score (likes + clips*2)
      result.sort((a, b) => (b.total_likes + b.clip_count * 2) - (a.total_likes + a.clip_count * 2));
      return result.slice(0, 10);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (creators.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-orbitron font-bold text-foreground flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" /> Discover Creators
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {creators.map((creator) => (
          <div
            key={creator.user_id}
            className="premium-card rounded-xl p-4 min-w-[160px] flex flex-col items-center gap-2 shrink-0"
          >
            <Link to={`/creator/${creator.user_id}`}>
              <Avatar className="w-14 h-14 border-2 border-primary/30">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-orbitron">
                  {(creator.username || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="text-center">
              <Link to={`/creator/${creator.user_id}`} className="flex items-center gap-1 justify-center">
                <span className="text-xs font-orbitron font-bold text-foreground truncate max-w-[100px]">
                  {creator.username || "User"}
                </span>
                {creator.is_verified && <VerifiedBadge size="sm" />}
              </Link>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-rajdhani">
                  <Film className="w-3 h-3" /> {creator.clip_count}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-rajdhani">
                  <Heart className="w-3 h-3" /> {creator.total_likes}
                </span>
              </div>
            </div>
            <FollowButton userId={creator.user_id} />
          </div>
        ))}
      </div>
    </div>
  );
}
