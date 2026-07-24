import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminAccess';

/**
 * useAdmin — production-grade authorization hook.
 *
 * isAdmin is true when ANY of the following hold:
 *   1. The authenticated user's email is the super-admin email (fast, synchronous).
 *   2. The user has an 'admin' or 'super_admin' row in the user_roles table.
 *   3. The user's profiles.role column is 'admin' or 'super_admin'.
 *
 * The super-admin email (path 1) NEVER waits for a DB query — access is
 * instant and cannot be revoked by database state.
 *
 * Paths 2 and 3 require DB queries and are subject to Supabase RLS. Neither
 * the frontend hook nor the UI alone enforces security — Supabase RLS policies
 * and the API server's email gate are the authoritative backend enforcement.
 */
export function useAdmin() {
  const { user } = useAuth();

  // Fast synchronous path: super-admin email bypasses all DB checks.
  const isSuperAdmin = isAdminEmail(user?.email);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminAccess', user?.id],
    queryFn: async () => {
      if (!user) return { isAdminFromDB: false, isModerator: false };

      // --- Check user_roles table ---
      let isAdminFromRoles = false;
      let isModerator = false;

      const { data: roles, error: tableError } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!tableError && Array.isArray(roles)) {
        const roleSet = new Set<string>(roles.map((r: any) => String(r.role)));
        console.log('[useAdmin] roles from user_roles table:', [...roleSet]);
        isAdminFromRoles = roleSet.has('admin') || roleSet.has('super_admin');
        isModerator = roleSet.has('moderator');
      } else if (tableError) {
        console.warn('[useAdmin] user_roles query failed, trying RPC:', tableError);

        // Fallback: has_role() RPC (SECURITY DEFINER, bypasses RLS)
        const [adminResult, superAdminResult, moderatorResult] = await Promise.all([
          (supabase as any).rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          (supabase as any).rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
          (supabase as any).rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
        ]);

        isAdminFromRoles = Boolean(adminResult.data) || Boolean(superAdminResult.data);
        isModerator = Boolean(moderatorResult.data);
        console.log('[useAdmin] RPC result — admin:', isAdminFromRoles, 'moderator:', isModerator);
      }

      // --- Also check profiles.role ---
      let isAdminFromProfile = false;
      let isModeratorFromProfile = false;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileError && profile) {
        const profileRole = String((profile as any).role ?? 'user');
        isAdminFromProfile = profileRole === 'admin' || profileRole === 'super_admin';
        isModeratorFromProfile = profileRole === 'moderator';
        console.log('[useAdmin] profiles.role:', profileRole);
      }

      return {
        isAdminFromDB: isAdminFromRoles || isAdminFromProfile,
        isModerator: isModerator || isModeratorFromProfile,
      };
    },
    // Super-admin email users always have access — skip the DB query for them.
    enabled: !!user && !isSuperAdmin,
    staleTime: 60 * 1000,
    retry: 3,
  });

  // Combine: super-admin email OR DB-confirmed role
  const isAdmin = isSuperAdmin || (data?.isAdminFromDB ?? false);
  const isModerator = data?.isModerator ?? false;

  // isLoading is only meaningful when we're actually waiting for the DB query.
  const isLoadingRole = !!user && !isSuperAdmin && isLoading;

  return {
    isAdmin,
    isSuperAdmin,
    isModerator,
    hasAdminAccess: isAdmin || isModerator,
    isLoading: isLoadingRole,
    isError,
  };
}

// ─── Admin data hooks ────────────────────────────────────────────────────────
// All hooks below gate their queries on hasAdminAccess so they never fire
// for non-admin users, even if somehow reached.

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
    staleTime: 30 * 1000,
  });
}

export function useAdminUsers() {
  const { hasAdminAccess } = useAdmin();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasAdminAccess) return;

    const channel = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hasAdminAccess, queryClient]);

  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

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
    refetchInterval: 30000,
  });
}

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

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      const walletsWithUsers = wallets.map(wallet => {
        const profile = profiles?.find(p => p.user_id === wallet.user_id);
        return { ...wallet, username: profile?.username ?? 'Unknown' };
      });

      return walletsWithUsers;
    },
    enabled: hasAdminAccess,
  });
}

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

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      const transactionsWithUsers = transactions.map(tx => {
        const profile = profiles?.find(p => p.user_id === tx.user_id);
        return { ...tx, username: profile?.username ?? 'Unknown' };
      });

      return transactionsWithUsers;
    },
    enabled: hasAdminAccess,
  });
}
