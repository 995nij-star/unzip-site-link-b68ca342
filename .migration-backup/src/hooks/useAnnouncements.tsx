import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "winner" | "general" | "tournament_result";
  tournament_id: string | null;
  winner_user_id: string | null;
  prize_amount: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Joined data
  winner_profile?: {
    username: string | null;
    uid: string | null;
    avatar_url: string | null;
  };
  tournament?: {
    title: string;
    game: string;
  };
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  type: "winner" | "general" | "tournament_result";
  tournament_id?: string | null;
  winner_user_id?: string | null;
  prize_amount?: number | null;
  is_published?: boolean;
}

export function useAnnouncements(showAll = false) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ["announcements", showAll],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data for each announcement
      const enrichedAnnouncements = await Promise.all(
        (data || []).map(async (announcement) => {
          let winner_profile = null;
          let tournament = null;

          if (announcement.winner_user_id) {
            const { data: profile } = await supabase
              .from("profiles_public")
              .select("username, uid, avatar_url")
              .eq("user_id", announcement.winner_user_id)
              .single();
            winner_profile = profile;
          }

          if (announcement.tournament_id) {
            const { data: tournamentData } = await supabase
              .from("tournaments")
              .select("title, game")
              .eq("id", announcement.tournament_id)
              .single();
            tournament = tournamentData;
          }

          return {
            ...announcement,
            winner_profile,
            tournament,
          } as Announcement;
        })
      );

      return enrichedAnnouncements;
    },
  });

  const createAnnouncement = useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create announcement", description: error.message, variant: "destructive" });
    },
  });

  const updateAnnouncement = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Announcement> & { id: string }) => {
      const { winner_profile: _wp, tournament: _t, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase
        .from("announcements")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update announcement", description: error.message, variant: "destructive" });
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Announcement deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete announcement", description: error.message, variant: "destructive" });
    },
  });

  return {
    announcements,
    isLoading,
    refetch,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  };
}
