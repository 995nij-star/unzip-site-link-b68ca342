import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
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
  created_at: string;
  room_id: string | null;
  room_password: string | null;
}

interface JoinResult {
  success: boolean;
  error?: string;
  message?: string;
}

export function useTournaments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [joinedTournamentIds, setJoinedTournamentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments_safe' as any)
      .select('*')
      .order('start_time', { ascending: true });

    if (!error && data) {
      setTournaments((data as any[]).map((t: any) => ({
        ...t,
        entry_fee: Number(t.entry_fee),
        prize_pool: Number(t.prize_pool)
      })));
    }
    setLoading(false);
  };

  const fetchJoinedTournaments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tournament_participants')
      .select('tournament_id')
      .eq('user_id', user.id);

    if (!error && data) {
      setJoinedTournamentIds(data.map(p => p.tournament_id));
    }
  };

  useEffect(() => {
    fetchTournaments();
    fetchJoinedTournaments();
  }, [user]);

  const joinTournament = async (
    tournamentId: string,
    playerName?: string,
    gameUid?: string,
    phoneNumber?: string
  ): Promise<JoinResult> => {
    if (!user) {
      return { success: false, error: 'Please log in to join tournaments' };
    }

    setJoining(tournamentId);

    try {
      const { data, error } = await supabase.rpc('join_tournament', {
        p_tournament_id: tournamentId,
        p_player_name: playerName || null,
        p_game_uid: gameUid || null,
        p_phone_number: phoneNumber || null
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      const result = data as unknown as JoinResult;

      if (result.success) {
        const r = result as JoinResult & { premium_slot?: boolean; discount?: number; charged_fee?: number };
        const parts: string[] = [r.message || "You've joined the tournament!"];
        if (r.premium_slot) parts.push("👑 Reserved Premium overflow slot used.");
        if (r.discount && r.discount > 0) parts.push(`Premium discount: ₹${r.discount} off (paid ₹${r.charged_fee}).`);
        toast({
          title: r.premium_slot ? "Joined via Premium Slot!" : "Success!",
          description: parts.join(" "),
        });
        // Refetch data
        await Promise.all([fetchTournaments(), fetchJoinedTournaments()]);
      } else {
        toast({
          title: "Cannot Join",
          description: result.error || "Failed to join tournament",
          variant: "destructive"
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return { success: false, error: errorMessage };
    } finally {
      setJoining(null);
    }
  };

  const isJoined = (tournamentId: string) => joinedTournamentIds.includes(tournamentId);

  return {
    tournaments,
    loading,
    joining,
    joinTournament,
    isJoined,
    refetch: () => {
      fetchTournaments();
      fetchJoinedTournaments();
    }
  };
}
