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
  processed_by: string | null;
  processed_at?: string | null;
  method?: string;
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
      return data as unknown as TopupRequest[];
    },
    enabled: !!user,
  });

  // Submit a new topup request
  const submitRequest = useMutation({
    mutationFn: async ({ amount, utr, screenshotUrl, method }: { amount: number; utr: string; screenshotUrl?: string; method?: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      if (!utr || !utr.trim()) throw new Error('UTR / Transaction ID is required');

      const { data, error } = await (supabase as any)
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

    // Bucket is private; create a long-lived signed URL so admins can view later
    const { data: signed } = await supabase.storage
      .from('topup-screenshots')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    return signed?.signedUrl ?? null;
  };

  return {
    requests: requests ?? [],
    isLoading,
    submitRequest,
    uploadScreenshot,
  };
}

