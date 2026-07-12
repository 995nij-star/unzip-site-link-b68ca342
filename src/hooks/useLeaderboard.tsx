import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardPlayer {
  user_id: string;
  username: string | null;
  uid: string | null;
  avatar_url: string | null;
  free_fire_uid: string | null;
  tournaments_played: number;
  wins: number;
  likes_count: number;
  is_verified: boolean;
}

export function useLeaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('player_leaderboard' as any)
      .select('*')
      .order('tournaments_played', { ascending: false })
      .order('wins', { ascending: false })
      .limit(100);

    if (!error && data) {
      const userIds = data.map((p: any) => p.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, free_fire_uid, is_verified')
        .in('user_id', userIds);
      
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      setPlayers(data.map((p: any) => {
        const profile = profileMap.get(p.user_id);
        return {
          user_id: p.user_id,
          username: p.username,
          uid: p.uid,
          avatar_url: p.avatar_url,
          free_fire_uid: profile?.free_fire_uid || null,
          tournaments_played: Number(p.tournaments_played) || 0,
          wins: Number(p.wins) || 0,
          likes_count: Number(p.likes_count) || 0,
          is_verified: profile?.is_verified || false,
        };
      }));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return {
    players,
    loading,
    refetch: fetchLeaderboard,
  };
}
