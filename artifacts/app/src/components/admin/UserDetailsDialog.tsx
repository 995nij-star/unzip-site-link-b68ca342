import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, User, Trophy, Coins, Calendar, Hash, Gamepad2, Mail, Circle, Phone, MapPin } from "lucide-react";
import { isUserOnline, getOnlineStatusText } from "@/hooks/usePresence";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserDetails {
  uid: string | null;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  city: string | null;
  free_fire_uid: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  is_banned: boolean | null;
  tournamentsJoined: number;
  totalSpent: number;
  tournaments: {
    id: string;
    title: string;
    game: string;
    entry_fee: number;
    joined_at: string;
  }[];
}

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export function UserDetailsDialog({ open, onOpenChange, userId }: UserDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  useEffect(() => {
    if (!open || !userId) {
      setUserDetails(null);
      return;
    }

    const fetchUserDetails = async () => {
      setLoading(true);

      // Fetch profile
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('uid, username, full_name, email, phone, age, city, free_fire_uid, avatar_url, created_at, is_banned, last_seen')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch tournaments joined with details
      const { data: participations } = await supabase
        .from('tournament_participants')
        .select(`
          joined_at,
          tournaments (
            id,
            title,
            game,
            entry_fee
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      // Calculate total spent
      const tournaments = participations?.map((p) => {
        const tournament = Array.isArray(p.tournaments) ? p.tournaments[0] : p.tournaments;
        return {
        id: tournament?.id ?? '',
        title: tournament?.title ?? 'Unknown',
        game: tournament?.game ?? 'Unknown',
        entry_fee: Number(tournament?.entry_fee ?? 0),
        joined_at: p.joined_at,
        };
      }).filter(t => t.id) ?? [];

      const totalSpent = tournaments.reduce((sum, t) => sum + t.entry_fee, 0);

      setUserDetails({
        uid: profile?.uid ?? null,
        username: profile?.username ?? null,
        full_name: (profile as any)?.full_name ?? null,
        email: profile?.email ?? null,
        phone: (profile as any)?.phone ?? null,
        age: (profile as any)?.age ?? null,
        city: (profile as any)?.city ?? null,
        free_fire_uid: (profile as any)?.free_fire_uid ?? null,
        avatar_url: profile?.avatar_url ?? null,
        created_at: profile?.created_at ?? '',
        last_seen: profile?.last_seen ?? null,
        is_banned: profile?.is_banned ?? false,
        tournamentsJoined: tournaments.length,
        totalSpent,
        tournaments,
      });

      setLoading(false);
    };

    fetchUserDetails();
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-xl">User Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
              <Avatar className="w-16 h-16 border-2 border-primary/30">
                <AvatarImage src={userDetails.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {userDetails.username?.[0]?.toUpperCase() ?? <User className="w-6 h-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-orbitron font-bold text-foreground">
                  {userDetails.full_name ?? userDetails.username ?? 'No username'}
                </h3>
                {userDetails.full_name && userDetails.username && (
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    @{userDetails.username}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm text-primary font-semibold">
                    {userDetails.uid ?? 'No UID'}
                  </span>
                </div>
                {userDetails.email && (
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-neon-cyan" />
                    <span className="text-sm text-muted-foreground font-rajdhani">
                      {userDetails.email}
                    </span>
                  </div>
                )}
                {userDetails.phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-neon-green" />
                    <span className="text-sm text-muted-foreground font-rajdhani">
                      {userDetails.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-1">
                  {userDetails.age && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-neon-orange" />
                      <span className="text-sm text-muted-foreground font-rajdhani">
                        {userDetails.age} yrs
                      </span>
                    </div>
                  )}
                  {userDetails.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-neon-pink" />
                      <span className="text-sm text-muted-foreground font-rajdhani">
                        {userDetails.city}
                      </span>
                    </div>
                  )}
                </div>
                {userDetails.free_fire_uid && (
                  <div className="flex items-center gap-2 mt-1">
                    <Gamepad2 className="w-4 h-4 text-neon-orange" />
                    <span className="text-sm text-muted-foreground font-rajdhani">
                      FF UID: <span className="text-neon-orange font-semibold">{userDetails.free_fire_uid}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Circle 
                    className={`w-2.5 h-2.5 ${
                      isUserOnline(userDetails.last_seen) 
                        ? 'fill-neon-green text-neon-green' 
                        : 'fill-muted-foreground/50 text-muted-foreground/50'
                    }`} 
                  />
                  <span className={`text-sm font-rajdhani ${
                    isUserOnline(userDetails.last_seen) ? 'text-neon-green' : 'text-muted-foreground'
                  }`}>
                    {getOnlineStatusText(userDetails.last_seen)}
                  </span>
                </div>
                {userDetails.is_banned && (
                  <Badge variant="destructive" className="mt-2 font-rajdhani">
                    Banned
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-center">
                <Trophy className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
                <p className="text-2xl font-orbitron font-bold text-foreground">
                  {userDetails.tournamentsJoined}
                </p>
                <p className="text-xs text-muted-foreground font-rajdhani">Tournaments</p>
              </div>
              <div className="p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30 text-center">
                <Coins className="w-6 h-6 text-neon-orange mx-auto mb-2" />
                <p className="text-2xl font-orbitron font-bold text-foreground">
                  ₹{userDetails.totalSpent}
                </p>
                <p className="text-xs text-muted-foreground font-rajdhani">Total Spent</p>
              </div>
              <div className="p-4 rounded-lg bg-neon-pink/10 border border-neon-pink/30 text-center">
                <Calendar className="w-6 h-6 text-neon-pink mx-auto mb-2" />
                <p className="text-sm font-orbitron font-bold text-foreground">
                  {userDetails.created_at ? format(new Date(userDetails.created_at), 'MMM d, yyyy') : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground font-rajdhani">Joined</p>
              </div>
            </div>

            {/* Tournament History */}
            <div>
              <h4 className="text-sm font-rajdhani font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Tournament History
              </h4>
              {userDetails.tournaments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 font-rajdhani">
                  No tournaments joined yet
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userDetails.tournaments.map((tournament) => (
                    <div
                      key={tournament.id + tournament.joined_at}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                    >
                      <div>
                        <p className="font-rajdhani font-medium text-foreground text-sm">
                          {tournament.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tournament.game} • {format(new Date(tournament.joined_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 font-rajdhani">
                        ₹{tournament.entry_fee}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">User not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
