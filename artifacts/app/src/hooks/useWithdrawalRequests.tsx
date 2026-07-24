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
      return data as unknown as WithdrawalRequest[];
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

      const { data, error } = await (supabase as any)
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

