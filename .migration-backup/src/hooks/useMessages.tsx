import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_user?: {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    uid: string | null;
    is_verified: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    is_read: boolean;
  };
  unread_count: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
}

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's conversation IDs
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations?.length) return [];

      const convIds = participations.map(p => p.conversation_id);

      // Get conversations
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (!convs) return [];

      // For each conversation, get other participant and last message
      const result: Conversation[] = [];

      for (const conv of convs) {
        // Get other participant
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", user.id);

        let otherUser = undefined;
        if (participants?.[0]) {
          const { data: profile } = await supabase
            .from("profiles_public")
            .select("user_id, username, avatar_url, uid, is_verified")
            .eq("user_id", participants[0].user_id)
            .single();
          otherUser = profile || undefined;
        }

        // Get last message
        const { data: lastMsgs } = await supabase
          .from("direct_messages")
          .select("content, created_at, sender_id, is_read")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get unread count
        const { count } = await supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        result.push({
          ...conv,
          other_user: otherUser,
          last_message: lastMsgs?.[0] || undefined,
          unread_count: count || 0,
        });
      }

      return result;
    },
    enabled: !!user,
  });

  // Realtime for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dm-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return { conversations, isLoading, totalUnread };
}

export function useDirectMessages(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["direct-messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      return (data || []) as DirectMessage[];
    },
    enabled: !!conversationId,
  });

  // Mark messages as read
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return;
    const unread = messages.filter(m => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        });
    }
  }, [messages, user, conversationId, queryClient]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["direct-messages", conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return { messages, isLoading };
}

export function useMessageActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content, attachmentUrl, attachmentType }: { conversationId: string; content: string; attachmentUrl?: string; attachmentType?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
      });
      if (error) throw error;

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });

  const startConversation = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Use secure server-side function to start conversation
      const { data, error } = await supabase.rpc("start_conversation", {
        p_other_user_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });

  return { sendMessage, startConversation };
}
