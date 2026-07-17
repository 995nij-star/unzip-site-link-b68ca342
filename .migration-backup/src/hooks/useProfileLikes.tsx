import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useProfileLikes(profileUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if current user has liked this profile
  const { data: hasLiked, isLoading: checkingLike } = useQuery({
    queryKey: ['profileLike', profileUserId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('profile_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('profile_user_id', profileUserId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking like status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id && !!profileUserId && user?.id !== profileUserId,
  });

  // Get like count for this profile
  const { data: likeCount, isLoading: countingLikes } = useQuery({
    queryKey: ['profileLikeCount', profileUserId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profile_likes')
        .select('*', { count: 'exact', head: true })
        .eq('profile_user_id', profileUserId);
      
      if (error) {
        console.error('Error counting likes:', error);
        return 0;
      }
      
      return count ?? 0;
    },
    enabled: !!profileUserId,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profile_likes')
        .insert({
          user_id: user.id,
          profile_user_id: profileUserId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileLike', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['profileLikeCount', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      toast({
        title: "Profile Liked!",
        description: "You've shown appreciation for this player.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlike mutation
  const unlikeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profile_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('profile_user_id', profileUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileLike', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['profileLikeCount', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleLike = () => {
    if (!user?.id) {
      toast({
        title: "Login Required",
        description: "Please login to like profiles.",
        variant: "destructive",
      });
      return;
    }
    
    if (user.id === profileUserId) {
      toast({
        title: "Cannot Like Yourself",
        description: "You can't like your own profile.",
        variant: "destructive",
      });
      return;
    }

    if (hasLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  return {
    hasLiked: hasLiked ?? false,
    likeCount: likeCount ?? 0,
    isLoading: checkingLike || countingLikes,
    isMutating: likeMutation.isPending || unlikeMutation.isPending,
    toggleLike,
    canLike: !!user?.id && user.id !== profileUserId,
  };
}
