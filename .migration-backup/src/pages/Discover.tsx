import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFollows } from "@/hooks/useFollows";
import { Link } from "react-router-dom";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  ArrowLeft, Search, Loader2, Film, Heart, Eye, UserPlus, Sparkles, Trophy, TrendingUp, Gamepad2, Star, Crown
} from "lucide-react";

interface DiscoverCreator {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  clip_count: number;
  total_likes: number;
  total_views: number;
  games: string[];
}

const GAME_FILTERS = [
  { label: "All", value: "all", icon: Gamepad2 },
  { label: "Free Fire", value: "free fire", icon: Gamepad2 },
  { label: "BGMI", value: "bgmi", icon: Gamepad2 },
  { label: "Valorant", value: "valorant", icon: Gamepad2 },
  { label: "COD Mobile", value: "cod", icon: Gamepad2 },
  { label: "GTA V", value: "gta", icon: Gamepad2 },
];

function FollowButton({ userId }: { userId: string }) {
  const { isFollowing, toggleFollow, isMutating, canFollow } = useFollows(userId);
  if (!canFollow) return null;
  return (
    <CyberButton
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={toggleFollow}
      disabled={isMutating}
      className="gap-1.5 text-xs"
    >
      <UserPlus className="w-3.5 h-3.5" />
      {isFollowing ? "Following" : "Follow"}
    </CyberButton>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["discover-all-creators", user?.id],
    queryFn: async () => {
      // Get all clips
      const { data: clips } = await supabase
        .from("gaming_clips")
        .select("id, user_id, title, description, views");
      if (!clips || clips.length === 0) return [];

      // Aggregate per creator
      const creatorMap: Record<string, { clip_count: number; total_views: number; clip_ids: string[]; games: Set<string> }> = {};
      clips.forEach((c) => {
        if (!creatorMap[c.user_id]) {
          creatorMap[c.user_id] = { clip_count: 0, total_views: 0, clip_ids: [], games: new Set() };
        }
        creatorMap[c.user_id].clip_count++;
        creatorMap[c.user_id].total_views += c.views || 0;
        creatorMap[c.user_id].clip_ids.push(c.id);
        // Extract game tags from title/description
        const text = `${c.title} ${c.description || ""}`.toLowerCase();
        if (text.includes("free fire") || text.includes("ff") || text.includes("garena")) creatorMap[c.user_id].games.add("free fire");
        if (text.includes("bgmi") || text.includes("pubg") || text.includes("battleground")) creatorMap[c.user_id].games.add("bgmi");
        if (text.includes("valorant") || text.includes("valo")) creatorMap[c.user_id].games.add("valorant");
        if (text.includes("cod") || text.includes("call of duty")) creatorMap[c.user_id].games.add("cod");
        if (text.includes("gta")) creatorMap[c.user_id].games.add("gta");
      });

      const creatorIds = Object.keys(creatorMap);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url, is_verified")
        .in("user_id", creatorIds);
      if (!profiles) return [];

      // Get likes count per creator
      const { data: allLikes } = await supabase
        .from("clip_likes")
        .select("clip_id");

      const likesPerCreator: Record<string, number> = {};
      if (allLikes) {
        const clipOwner: Record<string, string> = {};
        clips.forEach((c) => { clipOwner[c.id] = c.user_id; });
        allLikes.forEach((l) => {
          const owner = clipOwner[l.clip_id];
          if (owner) likesPerCreator[owner] = (likesPerCreator[owner] || 0) + 1;
        });
      }

      const result: DiscoverCreator[] = profiles.map((p) => ({
        user_id: p.user_id,
        username: p.username,
        avatar_url: p.avatar_url,
        is_verified: p.is_verified || false,
        clip_count: creatorMap[p.user_id]?.clip_count || 0,
        total_likes: likesPerCreator[p.user_id] || 0,
        total_views: creatorMap[p.user_id]?.total_views || 0,
        games: Array.from(creatorMap[p.user_id]?.games || []),
      }));

      // Sort by score
      result.sort((a, b) => (b.total_likes + b.clip_count * 2 + b.total_views * 0.1) - (a.total_likes + a.clip_count * 2 + a.total_views * 0.1));
      return result;
    },
  });

  // Filter creators
  const filtered = useMemo(() => {
    let list = creators.filter((c) => c.user_id !== user?.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.username?.toLowerCase().includes(q));
    }
    if (gameFilter !== "all") {
      list = list.filter((c) => c.games.includes(gameFilter));
    }
    return list;
  }, [creators, search, gameFilter, user?.id]);

  const featured = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/clips"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <Sparkles className="w-6 h-6 text-neon-cyan" />
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Discover</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search */}
        <div className="mb-6">
          <CyberInput
            icon={<Search className="w-5 h-5" />}
            placeholder="Search creators by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Game Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {GAME_FILTERS.map((g) => (
            <CyberButton
              key={g.value}
              size="sm"
              variant={gameFilter === g.value ? "default" : "outline"}
              onClick={() => setGameFilter(g.value)}
              className="shrink-0 gap-1.5"
            >
              <g.icon className="w-3.5 h-3.5" />
              {g.label}
            </CyberButton>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 premium-card rounded-2xl">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-rajdhani text-muted-foreground">No creators found</p>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <>
            {/* Featured Spotlights */}
            {featured.length > 0 && !search.trim() && (
              <section className="mb-8">
                <h2 className="text-lg font-orbitron font-bold text-foreground flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-neon-gold" /> Featured Creators
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {featured.map((creator, i) => (
                    <div
                      key={creator.user_id}
                      className={`relative premium-card rounded-2xl p-6 flex flex-col items-center text-center overflow-hidden ${
                        i === 0 ? "border-neon-gold/40 shadow-gold" : i === 1 ? "border-neon-cyan/30" : "border-neon-pink/30"
                      }`}
                    >
                      {/* Rank badge */}
                      <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-orbitron font-bold text-xs ${
                        i === 0 ? "bg-neon-gold/20 text-neon-gold border border-neon-gold/40" :
                        i === 1 ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40" :
                        "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
                      }`}>
                        #{i + 1}
                      </div>

                      <Link to={`/creator/${creator.user_id}`}>
                        <Avatar className={`w-20 h-20 border-2 mb-3 ${
                          i === 0 ? "border-neon-gold/50" : i === 1 ? "border-neon-cyan/50" : "border-neon-pink/50"
                        }`}>
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-lg">
                            {(creator.username || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <Link to={`/creator/${creator.user_id}`} className="flex items-center gap-1.5 mb-1">
                        <span className="font-orbitron font-bold text-foreground text-sm truncate max-w-[140px]">
                          {creator.username || "User"}
                        </span>
                        {creator.is_verified && <VerifiedBadge size="sm" />}
                      </Link>

                      {creator.games.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-center mb-3">
                          {creator.games.slice(0, 2).map((g) => (
                            <Badge key={g} variant="secondary" className="text-[10px] font-rajdhani capitalize">
                              {g}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3 w-full mb-4">
                        <div className="text-center">
                          <p className="text-lg font-orbitron font-bold text-foreground">{creator.clip_count}</p>
                          <p className="text-[10px] text-muted-foreground font-rajdhani flex items-center justify-center gap-0.5">
                            <Film className="w-3 h-3" /> Clips
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-orbitron font-bold text-foreground">{creator.total_likes}</p>
                          <p className="text-[10px] text-muted-foreground font-rajdhani flex items-center justify-center gap-0.5">
                            <Heart className="w-3 h-3" /> Likes
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-orbitron font-bold text-foreground">{creator.total_views}</p>
                          <p className="text-[10px] text-muted-foreground font-rajdhani flex items-center justify-center gap-0.5">
                            <Eye className="w-3 h-3" /> Views
                          </p>
                        </div>
                      </div>

                      <FollowButton userId={creator.user_id} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Creators List */}
            {(search.trim() ? filtered : rest).length > 0 && (
              <section>
                <h2 className="text-lg font-orbitron font-bold text-foreground flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {search.trim() ? "Search Results" : "All Creators"}
                </h2>
                <div className="space-y-3">
                  {(search.trim() ? filtered : rest).map((creator, i) => (
                    <div
                      key={creator.user_id}
                      className="premium-card rounded-xl p-4 flex items-center gap-4"
                    >
                      <span className="text-sm font-orbitron font-bold text-muted-foreground w-6 text-center shrink-0">
                        {search.trim() ? i + 1 : i + 4}
                      </span>

                      <Link to={`/creator/${creator.user_id}`}>
                        <Avatar className="w-12 h-12 border border-border">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-sm">
                            {(creator.username || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link to={`/creator/${creator.user_id}`} className="flex items-center gap-1.5">
                          <span className="font-orbitron font-bold text-foreground text-sm truncate">
                            {creator.username || "User"}
                          </span>
                          {creator.is_verified && <VerifiedBadge size="sm" />}
                        </Link>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-rajdhani">
                            <Film className="w-3 h-3" /> {creator.clip_count}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-rajdhani">
                            <Heart className="w-3 h-3" /> {creator.total_likes}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-rajdhani">
                            <Eye className="w-3 h-3" /> {creator.total_views}
                          </span>
                        </div>
                        {creator.games.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {creator.games.slice(0, 3).map((g) => (
                              <Badge key={g} variant="secondary" className="text-[9px] font-rajdhani capitalize py-0 h-4">
                                {g}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <FollowButton userId={creator.user_id} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
