import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ProfileLikeButton } from "@/components/ProfileLikeButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Gamepad2, 
  Search as SearchIcon, 
  ArrowLeft, 
  User, 
  Trophy,
  Loader2,
  UserX
} from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const uidSchema = z.string()
  .trim()
  .regex(/^\d{10}$/, { message: "UID must be exactly 10 digits" });

interface SearchResult {
  user_id: string;
  username: string | null;
  uid: string | null;
  avatar_url: string | null;
  free_fire_uid: string | null;
  tournaments_played: number;
  wins: number;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = uidSchema.safeParse(searchQuery);
    if (!validation.success) {
      toast({
        title: "Invalid UID",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchResult(null);

    try {
      // First find the profile by UID
      const { data: profile, error: profileError } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, username, uid, avatar_url, free_fire_uid")
        .eq("uid", searchQuery.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setSearchResult(null);
        setIsSearching(false);
        return;
      }

      // Get stats from leaderboard view
      const { data: stats } = await supabase
        .from("player_leaderboard")
        .select("*")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      const statsData = stats as any;

      setSearchResult({
        user_id: profile.user_id,
        username: profile.username,
        uid: profile.uid,
        avatar_url: profile.avatar_url,
        free_fire_uid: (profile as any).free_fire_uid || null,
        tournaments_played: Number(statsData?.tournaments_played) || 0,
        wins: Number(statsData?.wins) || 0,
      });
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search. Please try again.",
        variant: "destructive",
      });
    }

    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Gamepad2 className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
              </div>
              <span className="text-xl font-orbitron font-bold text-gradient-neon">
                Idexopn
              </span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
              <CyberButton
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </CyberButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Search Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <SearchIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-orbitron font-bold text-foreground mb-2">
            Find Player
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            Search for players using their 10-digit UID
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <div className="flex-1">
              <CyberInput
                type="text"
                placeholder="Enter 10-digit UID"
                value={searchQuery}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setSearchQuery(value);
                }}
                icon={<User className="w-5 h-5" />}
                maxLength={10}
              />
            </div>
            <CyberButton
              type="submit"
              disabled={isSearching || searchQuery.length !== 10}
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SearchIcon className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Search</span>
            </CyberButton>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center font-rajdhani">
            {searchQuery.length}/10 digits
          </p>
        </form>

        {/* Search Result */}
        {hasSearched && !isSearching && (
          <div className="space-y-4">
            {searchResult ? (
              <div className="p-6 rounded-xl bg-gradient-card border-2 border-primary/30 hover:border-primary/50 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-primary/50">
                      <AvatarImage src={searchResult.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-lg">
                        {searchResult.username?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-orbitron font-bold text-foreground">
                        {searchResult.username || "Unknown Player"}
                      </h2>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        UID: <span className="text-primary font-semibold">{searchResult.uid}</span>
                      </p>
                      {searchResult.free_fire_uid && (
                        <p className="text-sm text-muted-foreground font-rajdhani">
                          Free Fire UID: <span className="text-neon-orange font-semibold">{searchResult.free_fire_uid}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <ProfileLikeButton profileUserId={searchResult.user_id} size="lg" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border border-border text-center">
                    <Trophy className="w-5 h-5 text-neon-orange mx-auto mb-2" />
                    <p className="text-2xl font-orbitron font-bold text-foreground">
                      {searchResult.tournaments_played}
                    </p>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      Tournaments
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-border text-center">
                    <Trophy className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
                    <p className="text-2xl font-orbitron font-bold text-foreground">
                      {searchResult.wins}
                    </p>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      Wins
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-border text-center">
                    <Trophy className="w-5 h-5 text-neon-green mx-auto mb-2" />
                    <p className="text-2xl font-orbitron font-bold text-foreground">
                      {searchResult.wins}
                    </p>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      Wins
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-gradient-card border border-border text-center">
                <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-orbitron font-semibold text-foreground mb-2">
                  No Player Found
                </h3>
                <p className="text-muted-foreground font-rajdhani">
                  No player exists with UID: <span className="text-primary">{searchQuery}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground font-rajdhani mb-4">
            Looking for top players?
          </p>
          <Link to="/leaderboard">
            <CyberButton variant="outline">
              <Trophy className="w-4 h-4" />
              View Leaderboard
            </CyberButton>
          </Link>
        </div>
      </main>
    </div>
  );
}
