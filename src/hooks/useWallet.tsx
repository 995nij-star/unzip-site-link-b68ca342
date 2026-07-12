import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface Wallet {
  id: string;
  balance: number;
  updated_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wallet:', error);
    } else if (data) {
      setWallet({
        id: data.id,
        balance: Number(data.balance),
        updated_at: data.updated_at
      });
    } else {
      // Create wallet if doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single();

      if (!createError && newWallet) {
        setWallet({
          id: newWallet.id,
          balance: Number(newWallet.balance),
          updated_at: newWallet.updated_at
        });
      }
    }

    setLoading(false);
  };

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransactions(data.map(t => ({
        ...t,
        amount: Number(t.amount)
      })));
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [user]);

  const refetch = () => {
    fetchWallet();
    fetchTransactions();
  };

  return {
    wallet,
    transactions,
    loading,
    refetch,
    balance: wallet?.balance ?? 0
  };
}
