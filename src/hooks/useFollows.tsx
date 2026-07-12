import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function useFollows(profileUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user follows the profile
  const { data: isFollowing = false, isLoading: checkingFollow } = useQuery({
    queryKey: ["is-following", profileUserId, user?.id],
    queryFn: async () => {
      if (!user || !profileUserId || user.id === profileUserId) return false;
      const { data } = await supabase
        .from("user_follows" as any)
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profileUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!profileUserId && user.id !== profileUserId,
  });

  // Get follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return 0;
      const { count } = await supabase
        .from("user_follows" as any)
        .select("id", { count: "exact", head: true })
        .eq("following_id", profileUserId);
      return count || 0;
    },
    enabled: !!profileUserId,
  });

  // Get following count
  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return 0;
      const { count } = await supabase
        .from("user_follows" as any)
        .select("id", { count: "exact", head: true })
        .eq("follower_id", profileUserId);
      return count || 0;
    },
    enabled: !!profileUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profileUserId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_follows" as any)
        .insert({ follower_id: user.id, following_id: profileUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", profileUserId] });
      toast({ title: "Following!", description: "You're now following this creator" });
    },
    onError: () => toast({ title: "Error", description: "Failed to follow", variant: "destructive" }),
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profileUserId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_follows" as any)
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", profileUserId] });
      toast({ title: "Unfollowed", description: "You unfollowed this creator" });
    },
    onError: () => toast({ title: "Error", description: "Failed to unfollow", variant: "destructive" }),
  });

  const toggleFollow = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to follow creators", variant: "destructive" });
      return;
    }
    if (user.id === profileUserId) return;
    if (isFollowing) unfollowMutation.mutate();
    else followMutation.mutate();
  };

  return {
    isFollowing,
    followerCount,
    followingCount,
    toggleFollow,
    isLoading: checkingFollow,
    isMutating: followMutation.isPending || unfollowMutation.isPending,
    canFollow: !!user && user.id !== profileUserId,
  };
}
