import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserTicket {
  id: string;
  issue_type: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
  screenshot_urls: string[] | null;
}

export function useUserTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userTickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, issue_type, subject, message, status, created_at, updated_at, admin_notes, screenshot_urls')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserTicket[];
    },
    enabled: !!user?.id,
  });
}
