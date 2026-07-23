import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  stream_url: string;
  platform: string;
  thumbnail_url: string | null;
  is_live: boolean;
  viewer_count: number;
  created_at: string;
  ended_at: string | null;
  profiles?: { username: string | null; avatar_url: string | null; uid: string | null };
}

export interface StreamMessage {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null };
}

export function useStreams() {
  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["live-streams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching streams:", error);
        return [];
      }
      return (data || []) as unknown as LiveStream[];
    },
  });

  return { streams, isLoading };
}

export function useStream(streamId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stream, isLoading } = useQuery({
    queryKey: ["live-stream", streamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("*")
        .eq("id", streamId)
        .single();
      if (error) throw error;
      return data as unknown as LiveStream;
    },
    enabled: !!streamId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["stream-messages", streamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("stream_messages")
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(200);
      return (data || []) as unknown as StreamMessage[];
    },
    enabled: !!streamId,
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ["stream-reactions", streamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("stream_reactions")
        .select("emoji")
        .eq("stream_id", streamId);
      return data || [];
    },
    enabled: !!streamId,
  });

  // Track viewer presence and count
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!streamId) return;

    const presenceChannel = supabase.channel(`stream-presence-${streamId}`, {
      config: { presence: { key: user?.id || `anon-${Math.random().toString(36).slice(2)}` } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setViewerCount(count);

        // Update viewer_count in DB for the listing page
        supabase
          .from("live_streams")
          .update({ viewer_count: count })
          .eq("id", streamId)
          .then(() => {});
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user?.id || "anon", joined_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [streamId, user?.id]);

  // Realtime subscriptions for messages and reactions
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`stream-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_messages", filter: `stream_id=eq.${streamId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["stream-messages", streamId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stream_reactions", filter: `stream_id=eq.${streamId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["stream-reactions", streamId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId, queryClient]);

  return { stream, messages, reactions, viewerCount, isLoading };
}

export function useStreamActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createStream = useMutation({
    mutationFn: async (data: { title: string; description?: string; stream_url: string; platform: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("live_streams").insert({
        user_id: user.id,
        title: data.title,
        stream_url: data.stream_url,
        platform: data.platform,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-streams"] }),
  });

  const sendMessage = useMutation({
    mutationFn: async (data: { stream_id: string; message: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("stream_messages").insert({
        stream_id: data.stream_id,
        user_id: user.id,
        message: data.message,
      });
      if (error) throw error;
    },
  });

  const sendReaction = useMutation({
    mutationFn: async (data: { stream_id: string; emoji: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("stream_reactions").insert({
        stream_id: data.stream_id,
        user_id: user.id,
        emoji: data.emoji,
      });
      if (error) throw error;
    },
  });

  const endStream = useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase.from("live_streams").update({ is_live: false, ended_at: new Date().toISOString() }).eq("id", streamId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-streams"] }),
  });

  const deleteStream = useMutation({
    mutationFn: async (streamId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("live_streams").delete().eq("id", streamId).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-streams"] }),
  });

  return { createStream, sendMessage, sendReaction, endStream, deleteStream };
}
