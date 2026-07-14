import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  utr: string;
  screenshot_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
}

export function useTopupRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's own topup requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['topupRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('topup_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TopupRequest[];
    },
    enabled: !!user,
  });

  // Submit a new topup request
  const submitRequest = useMutation({
    mutationFn: async ({ amount, utr, screenshotUrl, method }: { amount: number; utr: string; screenshotUrl?: string; method?: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      if (!utr || !utr.trim()) throw new Error('UTR / Transaction ID is required');

      const { data, error } = await supabase
        .from('topup_requests')
        .insert({
          user_id: user.id,
          amount,
          utr: utr.trim(),
          method: method ?? 'upi',
          screenshot_url: screenshotUrl ?? null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topupRequests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your topup request has been submitted for review.',
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

  // Upload screenshot
  const uploadScreenshot = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('topup-screenshots')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('topup-screenshots')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  return {
    requests: requests ?? [],
    isLoading,
    submitRequest,
    uploadScreenshot,
  };
}

// Admin hook for managing all topup requests
export function useAdminTopupRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['adminTopupRequests'],
    queryFn: async () => {
      // Fetch all topup requests
      const { data: topups, error: topupsError } = await supabase
        .from('topup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (topupsError) throw topupsError;

      // Fetch profiles for usernames
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;

      // Merge data
      const requestsWithUsers = topups.map(req => {
        const profile = profiles?.find(p => p.user_id === req.user_id);
        return {
          ...req,
          username: profile?.username ?? 'Unknown',
        };
      });

      return requestsWithUsers as TopupRequest[];
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, adminId }: { requestId: string; adminId: string }) => {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('topup_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) throw new Error('Request not found');
      if (request.status !== 'pending') throw new Error('Request already processed');

      // Get or create wallet
      let { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', request.user_id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Wallet doesn't exist, create it
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: request.user_id, balance: 0 })
          .select()
          .single();

        if (createError) throw createError;
        wallet = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      // Update wallet balance
      const newBalance = Number(wallet.balance) + Number(request.amount);
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
          amount: request.amount,
          type: 'deposit',
          description: `UPI Topup (UTR: ${request.utr})`,
        });

      if (txError) throw txError;

      // Update request status
      const { error: updateError } = await supabase
        .from('topup_requests')
        .update({
          status: 'approved',
          approved_by: adminId,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTopupRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminWallets'] });
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
      toast({
        title: 'Approved',
        description: 'Topup request approved and wallet updated.',
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
        .from('topup_requests')
        .update({
          status: 'rejected',
          admin_notes: reason || 'Request rejected',
        })
        .eq('id', requestId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTopupRequests'] });
      toast({
        title: 'Rejected',
        description: 'Topup request has been rejected.',
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
