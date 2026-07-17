import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAdmin() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['adminAccess', user?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, isModerator: false };
const [adminResult, moderatorResult] = await Promise.all([
  (supabase as any).rpc('has_role', { _user_id: user.id, _role: 'admin' }),
  (supabase as any).rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
]);

  if (adminResult.error) throw adminResult.error;
if (moderatorResult.error) throw moderatorResult.error;

alert(
  `USER ID: ${user.id}
ADMIN: ${adminResult.data}
MODERATOR: ${moderatorResult.data}`
);

return {
  isAdmin: Boolean(adminResult.data),
  isModerator: Boolean(moderatorResult.data),
};
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const isAdmin = data?.isAdmin ?? false;
  const isModerator = data?.isModerator ?? false;


  return {
    isAdmin,
    isModerator,
    hasAdminAccess: isAdmin || isModerator,
    isLoading: !!user && isLoading,
  };
}
// Hook for fetching admin dashboard stats
export function useAdminStats() {
  const { hasAdminAccess } = useAdmin();

  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [usersResult, tournamentsResult, walletsResult, transactionsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('tournaments').select('id, status, prize_pool', { count: 'exact' }),
        supabase.from('wallets').select('balance'),
        supabase.from('wallet_transactions').select('amount, type, created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      const totalUsers = usersResult.count ?? 0;
      const tournaments = tournamentsResult.data ?? [];
      const wallets = walletsResult.data ?? [];
      const transactions = transactionsResult.data ?? [];

      const activeTournaments = tournaments.filter(t => t.status === 'live' || t.status === 'upcoming').length;
      const totalPrizePool = tournaments.reduce((sum, t) => sum + Number(t.prize_pool || 0), 0);
      const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);

      // Calculate revenue from entry fees
      const entryFeeRevenue = transactions
        .filter(t => t.type === 'entry_fee')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

      return {
        totalUsers,
        activeTournaments,
        totalTournaments: tournaments.length,
        totalPrizePool,
        totalBalance,
        entryFeeRevenue,
        recentTransactions: transactions.slice(0, 10),
      };
    },
    enabled: hasAdminAccess,
    staleTime: 30 * 1000, // Refresh every 30 seconds
  });
}

// Hook for fetching all users with their roles - with realtime updates
export function useAdminUsers() {
  const { hasAdminAccess } = useAdmin();
  const queryClient = useQueryClient();

  // Set up realtime subscription for profile changes
  useEffect(() => {
    if (!hasAdminAccess) return;

    const channel = supabase
      .channel('admin-users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Invalidate and refetch when any profile changes
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        () => {
          // Invalidate and refetch when any role changes
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasAdminAccess, queryClient]);

  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles = profiles.map(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.user_id) ?? [];
        const highestRole = userRoles.find(r => r.role === 'admin')?.role 
          || userRoles.find(r => r.role === 'moderator')?.role 
          || 'user';
        return {
          ...profile,
          role: highestRole as 'admin' | 'moderator' | 'user',
        };
      });

      return usersWithRoles;
    },
    enabled: hasAdminAccess,
    refetchInterval: 30000, // Also poll every 30 seconds as backup
  });
}

// Hook for fetching all tournaments with admin access
export function useAdminTournaments() {
  const { hasAdminAccess } = useAdmin();

  return useQuery({
    queryKey: ['adminTournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasAdminAccess,
  });
}

// Hook for fetching all wallets
export function useAdminWallets() {
  const { hasAdminAccess } = useAdmin();

  return useQuery({
    queryKey: ['adminWallets'],
    queryFn: async () => {
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (walletsError) throw walletsError;

      // Get profiles to show usernames
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      // Merge wallet data with usernames
      const walletsWithUsers = wallets.map(wallet => {
        const profile = profiles?.find(p => p.user_id === wallet.user_id);
        return {
          ...wallet,
          username: profile?.username ?? 'Unknown',
        };
      });

      return walletsWithUsers;
    },
    enabled: hasAdminAccess,
  });
}

// Hook for fetching all transactions
export function useAdminTransactions() {
  const { hasAdminAccess } = useAdmin();

  return useQuery({
    queryKey: ['adminTransactions'],
    queryFn: async () => {
      const { data: transactions, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (transactionsError) throw transactionsError;

      // Get profiles to show usernames
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      // Merge transaction data with usernames
      const transactionsWithUsers = transactions.map(tx => {
        const profile = profiles?.find(p => p.user_id === tx.user_id);
        return {
          ...tx,
          username: profile?.username ?? 'Unknown',
        };
      });

      return transactionsWithUsers;
    },
    enabled: hasAdminAccess,
  });
}
