import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  upi_id: string;
  account_holder_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
}

export function useWithdrawalRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['withdrawalRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user,
  });

  const submitRequest = useMutation({
    mutationFn: async ({ amount, upiId, accountHolderName }: { 
      amount: number; 
      upiId: string; 
      accountHolderName?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check wallet balance first
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw new Error('Could not fetch wallet balance');
      if (!wallet || Number(wallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }

      // Check for pending requests
      const { data: pending } = await supabase
        .from('withdrawal_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (pending && pending.length > 0) {
        throw new Error('You already have a pending withdrawal request');
      }

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount,
          upi_id: upiId,
          account_holder_name: accountHolderName || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawalRequests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your withdrawal request has been submitted for review.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive',
      });
    },
  });

  return {
    requests: requests ?? [],
    isLoading,
    submitRequest,
  };
}

// Admin hook
export function useAdminWithdrawalRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['adminWithdrawalRequests'],
    queryFn: async () => {
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username');

      const requestsWithUsers = withdrawals.map(req => {
        const profile = profiles?.find(p => p.user_id === req.user_id);
        return {
          ...req,
          username: profile?.username ?? 'Unknown',
        };
      });

      return requestsWithUsers as WithdrawalRequest[];
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, adminId }: { requestId: string; adminId: string }) => {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) throw new Error('Request not found');
      if (request.status !== 'pending') throw new Error('Request already processed');

      // Get wallet and verify balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', request.user_id)
        .single();

      if (walletError || !wallet) throw new Error('Wallet not found');
      if (Number(wallet.balance) < Number(request.amount)) {
        throw new Error('User has insufficient balance');
      }

      // Deduct from wallet
      const newBalance = Number(wallet.balance) - Number(request.amount);
      const { error: updateWalletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (updateWalletError) throw updateWalletError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: request.user_id,
          amount: -request.amount,
          type: 'withdrawal',
          description: `Withdrawal to UPI: ${request.upi_id}`,
        });

      if (txError) throw txError;

      // Update request status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_by: adminId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminWallets'] });
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
      toast({
        title: 'Approved',
        description: 'Withdrawal request approved and wallet updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          admin_notes: reason || 'Request rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWithdrawalRequests'] });
      toast({
        title: 'Rejected',
        description: 'Withdrawal request has been rejected.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      });
    },
  });

  return {
    requests: requests ?? [],
    isLoading,
    approveRequest,
    rejectRequest,
  };
}
