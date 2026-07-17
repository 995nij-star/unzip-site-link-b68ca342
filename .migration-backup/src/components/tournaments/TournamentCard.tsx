import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CyberButton } from '@/components/ui/cyber-button';
import { Trophy, Users, Clock, Coins, Gamepad2, CheckCircle, Loader2, Key, Copy, Timer, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePremium } from '@/hooks/usePremium';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import trophyGold from "@/assets/trophy-gold.png";

interface TournamentCardProps {
  tournament: {
    id: string;
    title: string;
    description: string | null;
    game: string;
    entry_fee: number;
    prize_pool: number;
    max_players: number;
    current_players: number;
    start_time: string;
    status: string;
    room_id?: string | null;
    room_password?: string | null;
    image_url?: string | null;
  };
  isJoined: boolean;
  isJoining: boolean;
  onJoin: () => void;
}

export function TournamentCard({ tournament, isJoined, isJoining, onJoin }: TournamentCardProps) {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { isPremium } = usePremium();
  const isFull = tournament.current_players >= tournament.max_players;
  const isUpcoming = tournament.status === 'upcoming';
  const premiumOverflowAvailable = isFull && isPremium && tournament.current_players < tournament.max_players + 1;
  const canJoin = isUpcoming && (!isFull || premiumOverflowAvailable) && !isJoined;
  const hasRoomCredentials = tournament.room_id && tournament.room_password;

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const startTime = new Date(tournament.start_time).getTime();
      const diff = startTime - now;

      if (diff <= 0) {
        setTimeRemaining('Started');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [tournament.start_time]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const statusColors: Record<string, string> = {
    upcoming: 'upcoming-badge',
    live: 'live-badge',
    completed: 'text-muted-foreground bg-muted',
    cancelled: 'text-destructive bg-destructive/10'
  };

  return (
    <div className="relative p-6 rounded-xl premium-card hover:border-neon-blue/60 transition-all duration-300 group overflow-hidden">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-neon-blue/5 via-neon-purple/5 to-transparent rounded-xl" />
      
      {/* Trophy decoration for live tournaments */}
      {tournament.status === 'live' && (
        <img 
          src={trophyGold} 
          alt="" 
          className="absolute -right-4 -top-4 w-24 h-24 object-contain opacity-20 group-hover:opacity-30 transition-opacity" 
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {tournament.image_url ? (
              <img 
                src={tournament.image_url} 
                alt={tournament.game}
                className="w-10 h-10 rounded-lg object-cover border border-neon-blue/30"
              />
            ) : (
              <div className="p-2 rounded-lg bg-neon-blue/10">
                <Gamepad2 className="w-5 h-5 text-neon-blue" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-orbitron font-bold text-foreground">
                {tournament.title}
              </h3>
              <p className="text-sm text-muted-foreground font-rajdhani">
                {tournament.game}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {premiumOverflowAvailable && !isJoined && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-neon-purple/15 border border-neon-purple/40 text-neon-purple text-[10px] font-orbitron font-bold uppercase tracking-wider animate-pulse cursor-help"
                      aria-label="Premium overflow slot available"
                    >
                      <Crown className="w-3 h-3" />
                      Premium Slot
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px] text-xs font-rajdhani leading-relaxed">
                    <p className="font-bold text-neon-purple mb-1 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Premium Overflow Slot
                    </p>
                    <p>
                      One extra slot is reserved for Premium members when a tournament fills up — letting you join even after the cap is reached.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Becomes unavailable once another Premium member claims it, the tournament goes Live, or registration closes.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className={statusColors[tournament.status]}>
              {tournament.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <p className="text-sm text-muted-foreground font-rajdhani mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-primary/10">
            <Coins className="w-4 h-4 text-neon-cyan" />
            <div>
              <p className="text-xs text-muted-foreground font-rajdhani">Entry Fee</p>
              <p className="text-sm font-orbitron font-bold text-foreground">₹{tournament.entry_fee}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-primary/10">
            <Trophy className="w-4 h-4 text-neon-pink" />
            <div>
              <p className="text-xs text-muted-foreground font-rajdhani">Prize Pool</p>
              <p className="text-sm font-orbitron font-bold text-neon-pink">₹{tournament.prize_pool}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-primary/10">
            <Users className="w-4 h-4 text-neon-green" />
            <div>
              <p className="text-xs text-muted-foreground font-rajdhani">Players</p>
              <p className="text-sm font-orbitron font-bold text-foreground">
                {tournament.current_players}/{tournament.max_players}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-primary/10">
            <Clock className="w-4 h-4 text-neon-cyan" />
            <div>
              <p className="text-xs text-muted-foreground font-rajdhani">Starts</p>
              <p className="text-sm font-orbitron font-bold text-foreground">
                {format(new Date(tournament.start_time), 'MMM d, HH:mm')}
              </p>
            </div>
          </div>
        </div>

        {/* Countdown Timer - Only for upcoming tournaments */}
        {isUpcoming && timeRemaining && timeRemaining !== 'Started' && (
           <div className="mb-4 p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
            <div className="flex items-center justify-center gap-2">
               <Timer className="w-5 h-5 text-neon-cyan animate-pulse" />
               <span className="text-sm font-rajdhani text-muted-foreground">Starts in</span>
               <span className="text-lg font-orbitron font-bold text-neon-cyan">{timeRemaining}</span>
             </div>
          </div>
        )}

        {/* Progress bar for slots */}
        <div className="mb-4">
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
             className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-500"
             style={{ width: `${(tournament.current_players / tournament.max_players) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground font-rajdhani mt-1 text-right">
            {isFull
              ? (premiumOverflowAvailable ? '1 Premium slot available' : 'Full')
              : `${tournament.max_players - tournament.current_players} slots left`}
          </p>
        </div>

        {/* Room Credentials - Only shown to joined users */}
        {isJoined && hasRoomCredentials && (
           <div className="mb-4 p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
            <div className="flex items-center gap-2 mb-2">
               <Key className="w-4 h-4 text-neon-cyan" />
               <span className="text-sm font-rajdhani font-semibold text-neon-cyan">Room Credentials</span>
             </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-2 rounded bg-background/50">
                <div>
                  <p className="text-xs text-muted-foreground font-rajdhani">Room ID</p>
                  <p className="text-sm font-orbitron font-bold text-foreground">{tournament.room_id}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(tournament.room_id!, 'Room ID')}
                   className="p-1.5 rounded hover:bg-neon-cyan/20 transition-colors"
                 >
                   <Copy className="w-4 h-4 text-muted-foreground hover:text-neon-cyan" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded bg-background/50">
                <div>
                  <p className="text-xs text-muted-foreground font-rajdhani">Password</p>
                  <p className="text-sm font-orbitron font-bold text-foreground">{tournament.room_password}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(tournament.room_password!, 'Password')}
                   className="p-1.5 rounded hover:bg-neon-cyan/20 transition-colors"
                 >
                   <Copy className="w-4 h-4 text-muted-foreground hover:text-neon-cyan" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {isJoined ? (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
            <CheckCircle className="w-5 h-5 text-neon-green" />
            <span className="font-rajdhani font-semibold text-neon-green">Joined</span>
          </div>
        ) : (
          <CyberButton
            onClick={onJoin}
            disabled={!canJoin || isJoining}
            className={`w-full ${canJoin ? 'golden-button' : ''}`}
            variant={isFull && !premiumOverflowAvailable ? "ghost" : "default"}
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : premiumOverflowAvailable ? (
              <>
                <Crown className="w-4 h-4 mr-2 text-neon-purple" />
                Join via Premium Slot
              </>
            ) : isFull ? (
              'Tournament Full'
            ) : !isUpcoming ? (
              'Registration Closed'
            ) : (
              `Join Now`
            )}
          </CyberButton>
        )}
      </div>
    </div>
  );
}
