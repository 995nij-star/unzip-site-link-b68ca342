import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useTournaments } from "@/hooks/useTournaments";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { JoinTournamentDialog } from "@/components/tournaments/JoinTournamentDialog";
import { 
  Gamepad2, 
  LogOut, 
  Wallet,
  Trophy,
  Loader2,
  ArrowLeft
} from "lucide-react";
import trophyGold from "@/assets/trophy-gold.png";

interface SelectedTournament {
  id: string;
  title: string;
  game: string;
  entry_fee: number;
}

export default function Tournaments() {
  const { user, signOut } = useAuth();
  const { balance } = useWallet();
  const { tournaments, loading, joining, joinTournament, isJoined, refetch } = useTournaments();
  const navigate = useNavigate();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<SelectedTournament | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const openJoinDialog = (tournament: SelectedTournament) => {
    setSelectedTournament(tournament);
    setJoinDialogOpen(true);
  };

  const handleJoin = async (playerName: string, gameUid: string, phoneNumber: string) => {
    if (!selectedTournament) return;
    const result = await joinTournament(selectedTournament.id, playerName, gameUid, phoneNumber);
    if (result.success) {
      setJoinDialogOpen(false);
      setSelectedTournament(null);
    }
  };

  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming');
  const liveTournaments = tournaments.filter(t => t.status === 'live');
  const pastTournaments = tournaments.filter(t => t.status === 'completed' || t.status === 'cancelled');

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
              
              {/* Wallet Balance */}
              <Link 
                to="/wallet"
                className="flex items-center gap-2 px-4 py-2 rounded-lg premium-card hover:border-neon-blue/50 transition-colors"
              >
                <Wallet className="w-4 h-4 text-neon-green" />
                <span className="font-orbitron font-bold text-foreground">₹{balance.toFixed(2)}</span>
              </Link>

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
        {/* Hero Section */}
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl premium-card-featured overflow-hidden">
          <div className="absolute inset-0 opacity-40">
             <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/20 rounded-full blur-3xl" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-purple/15 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <CyberButton variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </CyberButton>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-foreground mb-1">
                  Compete in <span className="text-gradient-neon">Tournaments</span>
                </h1>
                <p className="text-muted-foreground font-rajdhani">
                  Join competitive tournaments and win big prizes.
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <img src={trophyGold} alt="Trophy" className="w-28 h-28 object-contain drop-shadow-2xl" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 premium-card rounded-2xl">
            <Trophy className="w-16 h-16 text-neon-blue/50 mx-auto mb-4" />
            <h2 className="text-xl font-orbitron font-bold text-foreground mb-2">
              No Tournaments Yet
            </h2>
            <p className="text-muted-foreground font-rajdhani">
              Check back soon for exciting tournaments!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Tournaments */}
            {liveTournaments.length > 0 && (
              <section>
                <h2 className="text-xl font-orbitron font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="live-badge">LIVE</span>
                  Now Playing
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      isJoined={isJoined(tournament.id)}
                      isJoining={joining === tournament.id}
                      onJoin={() => openJoinDialog({
                        id: tournament.id,
                        title: tournament.title,
                        game: tournament.game,
                        entry_fee: tournament.entry_fee
                      })}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Tournaments */}
            {upcomingTournaments.length > 0 && (
              <section>
                <h2 className="text-xl font-orbitron font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="upcoming-badge">UPCOMING</span>
                  Featured Tournaments
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      isJoined={isJoined(tournament.id)}
                      isJoining={joining === tournament.id}
                      onJoin={() => openJoinDialog({
                        id: tournament.id,
                        title: tournament.title,
                        game: tournament.game,
                        entry_fee: tournament.entry_fee
                      })}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past Tournaments */}
            {pastTournaments.length > 0 && (
              <section>
                <h2 className="text-xl font-orbitron font-bold text-foreground mb-4 text-muted-foreground">
                  Past Tournaments
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                  {pastTournaments.map(tournament => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      isJoined={isJoined(tournament.id)}
                      isJoining={false}
                      onJoin={() => {}}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Join Tournament Dialog */}
        <JoinTournamentDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          tournament={selectedTournament}
          isJoining={joining !== null}
          onJoin={handleJoin}
        />
      </main>
    </div>
  );
}
