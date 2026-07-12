import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ProfileLikeButton } from "@/components/ProfileLikeButton";
import { 
  Gamepad2, 
  LogOut, 
  Trophy,
  ArrowLeft,
  Crown,
  Medal,
  Loader2,
  Users,
  Target,
  Heart
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import rank1 from "@/assets/rank-1.png";
import rank2 from "@/assets/rank-2.png";
import rank3 from "@/assets/rank-3.png";

export default function Leaderboard() {
  const { user, signOut } = useAuth();
  const { players, loading } = useLeaderboard();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <img src={rank1} alt="1st" className="w-10 h-10 object-contain" />;
      case 1:
        return <img src={rank2} alt="2nd" className="w-10 h-10 object-contain" />;
      case 2:
        return <img src={rank3} alt="3rd" className="w-10 h-10 object-contain" />;
      default:
        return (
          <span className="w-10 h-10 flex items-center justify-center font-orbitron font-bold text-muted-foreground text-lg">
            {index + 1}
          </span>
        );
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/5 border-yellow-500/60 shadow-lg shadow-yellow-500/10";
      case 1:
        return "bg-gradient-to-r from-gray-400/15 to-gray-500/5 border-gray-400/40";
      case 2:
        return "bg-gradient-to-r from-amber-600/20 to-amber-700/5 border-amber-600/50";
      default:
        return "premium-card hover:border-neon-blue/30";
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <Gamepad2 className="w-8 h-8 text-neon-blue" />
                  <div className="absolute inset-0 bg-neon-blue/30 blur-lg rounded-full" />
                </div>
                <span className="text-xl font-orbitron font-bold text-gradient-neon">
                  Idexopn
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
              <CyberButton 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </CyberButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <CyberButton variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </CyberButton>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-neon-cyan" />
              <span className="text-sm font-rajdhani font-semibold text-neon-cyan uppercase tracking-wider">
                Rankings
              </span>
            </div>
            <h1 className="text-3xl font-orbitron font-bold text-foreground flex items-center gap-3">
              Leaderboard <span className="text-gradient-neon">Heroes</span>
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20 rounded-xl premium-card">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-orbitron font-bold text-foreground mb-2">
              No Players Yet
            </h3>
            <p className="text-muted-foreground font-rajdhani max-w-md mx-auto">
              Be the first to compete in tournaments and claim your spot on the leaderboard!
            </p>
            <Link to="/tournaments" className="inline-block mt-6">
              <CyberButton className="golden-button">
                <Trophy className="w-4 h-4 mr-2" />
                Browse Tournaments
              </CyberButton>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top 3 Podium */}
            {players.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Second Place */}
                <div className="relative p-6 rounded-xl bg-gradient-to-b from-gray-400/15 to-gray-500/5 border-2 border-gray-400/40 mt-8">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <img src={rank2} alt="2nd" className="w-12 h-12 object-contain" />
                  </div>
                  <div className="text-center pt-2">
                    <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-gray-400">
                      <AvatarImage src={players[1]?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary font-orbitron">
                        {players[1]?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-orbitron font-bold text-foreground truncate flex items-center gap-1">
                      {players[1]?.username || 'Anonymous'}
                      {players[1]?.is_verified && <VerifiedBadge />}
                    </p>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      #{players[1]?.uid}
                    </p>
                    <p className="text-lg font-orbitron font-bold text-gray-300 mt-2">
                      {players[1]?.tournaments_played} Played
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-rajdhani font-semibold bg-neon-blue/20 text-neon-blue">
                      {players[1]?.wins} Wins
                    </span>
                  </div>
                </div>

                {/* First Place */}
                <div className="relative p-6 rounded-xl bg-gradient-to-b from-yellow-500/25 to-yellow-600/5 border-2 border-yellow-500/60 shadow-lg shadow-yellow-500/20">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <img src={rank1} alt="1st" className="w-14 h-14 object-contain drop-shadow-lg" />
                  </div>
                  <div className="text-center pt-4">
                    <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-yellow-500 shadow-xl shadow-yellow-500/40">
                      <AvatarImage src={players[0]?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary font-orbitron text-xl">
                        {players[0]?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-orbitron font-bold text-foreground text-lg truncate flex items-center gap-1 justify-center">
                      {players[0]?.username || 'Anonymous'}
                      {players[0]?.is_verified && <VerifiedBadge size="md" />}
                    </p>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      #{players[0]?.uid}
                    </p>
                    <p className="text-2xl font-orbitron font-bold text-gradient-gold mt-2">
                      {players[0]?.tournaments_played} Played
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-rajdhani font-semibold bg-neon-green/20 text-neon-green">
                      {players[0]?.wins} Wins
                    </span>
                  </div>
                </div>

                {/* Third Place */}
                <div className="relative p-6 rounded-xl bg-gradient-to-b from-amber-600/15 to-amber-700/5 border-2 border-amber-600/40 mt-8">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <img src={rank3} alt="3rd" className="w-12 h-12 object-contain" />
                  </div>
                  <div className="text-center pt-2">
                    <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-amber-600">
                      <AvatarImage src={players[2]?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary font-orbitron">
                        {players[2]?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-orbitron font-bold text-foreground truncate flex items-center gap-1">
                      {players[2]?.username || 'Anonymous'}
                      {players[2]?.is_verified && <VerifiedBadge />}
                    </p>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      #{players[2]?.uid}
                    </p>
                    <p className="text-lg font-orbitron font-bold text-amber-500 mt-2">
                      {players[2]?.tournaments_played} Played
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-rajdhani font-semibold bg-neon-orange/20 text-neon-orange">
                      {players[2]?.wins} Wins
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="rounded-xl overflow-hidden premium-card">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-secondary/30 border-b border-neon-blue/20">
                <div className="col-span-1 text-xs font-rajdhani font-semibold text-muted-foreground uppercase">
                  Rank
                </div>
                <div className="col-span-4 text-xs font-rajdhani font-semibold text-muted-foreground uppercase">
                  Player
                </div>
                <div className="col-span-2 text-xs font-rajdhani font-semibold text-muted-foreground uppercase text-center">
                  <Target className="w-4 h-4 inline mr-1" />
                  Played
                </div>
                <div className="col-span-2 text-xs font-rajdhani font-semibold text-muted-foreground uppercase text-center">
                  <Trophy className="w-4 h-4 inline mr-1" />
                  Wins
                </div>
                <div className="col-span-2 text-xs font-rajdhani font-semibold text-muted-foreground uppercase text-center">
                  <Trophy className="w-4 h-4 inline mr-1" />
                  Wins
                </div>
                <div className="col-span-1 text-xs font-rajdhani font-semibold text-muted-foreground uppercase text-center">
                  <Heart className="w-4 h-4 inline mr-1" />
                  Likes
                </div>
              </div>

              {/* Player Rows */}
              <div className="divide-y divide-neon-blue/10">
                {players.map((player, index) => (
                  <div 
                    key={player.user_id}
                    className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${getRankStyle(index)} ${
                      player.user_id === user?.id ? 'ring-2 ring-neon-cyan/50' : ''
                    }`}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="col-span-4 flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-primary/30">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary font-orbitron text-sm">
                          {player.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-rajdhani font-semibold text-foreground flex items-center gap-1">
                          {player.username || 'Anonymous'}
                          {player.is_verified && <VerifiedBadge />}
                          {player.user_id === user?.id && (
                            <span className="ml-1 text-xs text-neon-cyan">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-rajdhani">
                          #{player.uid}
                          {player.free_fire_uid && (
                            <span className="ml-2 text-neon-orange">FF: {player.free_fire_uid}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-orbitron font-semibold text-foreground">
                        {player.tournaments_played}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-orbitron font-semibold text-neon-cyan">
                        {player.wins}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <ProfileLikeButton 
                        profileUserId={player.user_id} 
                        size="sm"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="font-orbitron font-semibold text-neon-cyan text-sm">
                        {player.wins}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
