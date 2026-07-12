import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVideoSettings, validateVideoFile, validateVideoDuration, validateVideoResolution } from "@/hooks/useVideoSettings";

export interface GamingClip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views: number;
  created_at: string;
  short_code?: string | null;
  profile?: { username: string | null; avatar_url: string | null; uid: string | null };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export interface ClipComment {
  id: string;
  clip_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string | null;
  avatar_url?: string | null;
}

async function enrichClip(clip: any, userId?: string): Promise<GamingClip> {
  const { data: profile } = await supabase
    .from("profiles_public")
    .select("username, avatar_url, uid")
    .eq("user_id", clip.user_id)
    .single();

  const { count: likesCount } = await supabase
    .from("clip_likes")
    .select("id", { count: "exact", head: true })
    .eq("clip_id", clip.id);

  const { count: commentsCount } = await supabase
    .from("clip_comments")
    .select("id", { count: "exact", head: true })
    .eq("clip_id", clip.id);

  let isLiked = false;
  if (userId) {
    const { data: like } = await supabase
      .from("clip_likes")
      .select("id")
      .eq("clip_id", clip.id)
      .eq("user_id", userId)
      .maybeSingle();
    isLiked = !!like;
  }

  return {
    ...clip,
    profile: profile || undefined,
    likes_count: likesCount || 0,
    comments_count: commentsCount || 0,
    is_liked: isLiked,
  };
}

export function useClipsFeed() {
  const { user } = useAuth();

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["clips-feed"],
    queryFn: async () => {
      const { data: clipsData, error } = await supabase
        .from("gaming_clips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !clipsData) return [];
      return Promise.all(clipsData.map(c => enrichClip(c, user?.id)));
    },
  });

  return { clips, isLoading };
}

export function useFollowingClipsFeed() {
  const { user } = useAuth();

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["following-clips-feed", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get followed user IDs
      const { data: follows } = await supabase
        .from("user_follows" as any)
        .select("following_id")
        .eq("follower_id", user.id);
      if (!follows || follows.length === 0) return [];

      const followedIds = follows.map((f: any) => f.following_id);
      const { data: clipsData, error } = await supabase
        .from("gaming_clips")
        .select("*")
        .in("user_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !clipsData) return [];
      return Promise.all(clipsData.map(c => enrichClip(c, user.id)));
    },
    enabled: !!user,
  });

  return { clips, isLoading };
}

export function useTrendingClips() {
  const { user } = useAuth();

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["trending-clips"],
    queryFn: async () => {
      // Get clips with most likes in the last 7 days
      const { data: clipsData, error } = await supabase
        .from("gaming_clips")
        .select("*")
        .order("views", { ascending: false })
        .limit(50);

      if (error || !clipsData) return [];

      // Enrich and sort by likes
      const enriched = await Promise.all(clipsData.map(c => enrichClip(c, user?.id)));
      return enriched.sort((a, b) => b.likes_count - a.likes_count);
    },
  });

  return { clips, isLoading };
}

export function useSingleClip(clipId: string) {
  const { user } = useAuth();

  const { data: clip, isLoading } = useQuery({
    queryKey: ["single-clip", clipId],
    queryFn: async () => {
      const { data: clipData, error } = await supabase
        .from("gaming_clips")
        .select("*")
        .eq("id", clipId)
        .single();

      if (error || !clipData) return null;

      // Increment views
      await supabase
        .from("gaming_clips")
        .update({ views: ((clipData as any).views || 0) + 1 } as any)
        .eq("id", (clipData as any).id);

      return enrichClip(clipData, user?.id);
    },
    enabled: !!clipId,
  });

  return { clip: clip || null, isLoading };
}

export function useClipByShortCode(shortCode: string) {
  const { user } = useAuth();

  const { data: clip, isLoading } = useQuery({
    queryKey: ["clip-short", shortCode],
    queryFn: async () => {
      const { data: clipData, error } = await supabase
        .from("gaming_clips")
        .select("*")
        .eq("short_code", shortCode as any)
        .single();

      if (error || !clipData) return null;

      // Increment views
      await supabase
        .from("gaming_clips")
        .update({ views: ((clipData as any).views || 0) + 1 } as any)
        .eq("id", (clipData as any).id);

      return enrichClip(clipData, user?.id);
    },
    enabled: !!shortCode,
  });

  return { clip: clip || null, isLoading };
}

export function useUserClips(userId?: string) {
  const { user } = useAuth();

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["user-clips", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("gaming_clips")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!data) return [];
      return Promise.all(data.map(c => enrichClip(c, user?.id)));
    },
    enabled: !!userId,
  });

  return { clips, isLoading };
}

export function useClipComments(clipId: string) {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["clip-comments", clipId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clip_comments")
        .select("*")
        .eq("clip_id", clipId)
        .order("created_at", { ascending: true });

      if (!data) return [];

      const enriched: ClipComment[] = [];
      for (const c of data) {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("username, avatar_url")
          .eq("user_id", c.user_id)
          .single();
        enriched.push({
          ...c,
          username: profile?.username,
          avatar_url: profile?.avatar_url,
        });
      }
      return enriched;
    },
    enabled: !!clipId,
  });

  return { comments, isLoading };
}

export function useClipActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings: videoSettings } = useVideoSettings();

  const uploadClip = useMutation({
    mutationFn: async (data: { title: string; description?: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");

      // Validate file format and size
      const fileValidation = validateVideoFile(data.file, videoSettings);
      if (!fileValidation.valid) throw new Error(fileValidation.error);

      // Validate duration
      const duration = await getVideoDuration(data.file);
      const durationValidation = validateVideoDuration(duration, videoSettings);
      if (!durationValidation.valid) throw new Error(durationValidation.error);

      // Validate resolution
      const resolution = await getVideoResolution(data.file);
      const resValidation = validateVideoResolution(resolution.width, resolution.height, videoSettings);
      if (!resValidation.valid) throw new Error(resValidation.error);

      const ext = data.file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("gaming-clips")
        .upload(path, data.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("gaming-clips")
        .getPublicUrl(path);

      const { error } = await supabase.from("gaming_clips").insert({
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        video_url: urlData.publicUrl,
        duration: Math.round(duration),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips-feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-clips"] });
      queryClient.invalidateQueries({ queryKey: ["trending-clips"] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ clipId, isLiked }: { clipId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isLiked) {
        await supabase.from("clip_likes").delete().eq("clip_id", clipId).eq("user_id", user.id);
      } else {
        await supabase.from("clip_likes").insert({ clip_id: clipId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips-feed"] });
      queryClient.invalidateQueries({ queryKey: ["single-clip"] });
      queryClient.invalidateQueries({ queryKey: ["clip-short"] });
      queryClient.invalidateQueries({ queryKey: ["trending-clips"] });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ clipId, content }: { clipId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("clip_comments").insert({
        clip_id: clipId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["clip-comments", vars.clipId] });
      queryClient.invalidateQueries({ queryKey: ["clips-feed"] });
    },
  });

  const deleteClip = useMutation({
    mutationFn: async (clipId: string) => {
      const { error } = await supabase.from("gaming_clips").delete().eq("id", clipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips-feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-clips"] });
      queryClient.invalidateQueries({ queryKey: ["trending-clips"] });
    },
  });

  const reportClip = useMutation({
    mutationFn: async ({ clipId, reason }: { clipId: string; reason: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("clip_reports" as any).insert({
        clip_id: clipId,
        reporter_id: user.id,
        reason,
      });
      if (error) throw error;
    },
  });

  return { uploadClip, toggleLike, addComment, deleteClip, reportClip };
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = URL.createObjectURL(file);
  });
}

function getVideoResolution(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => reject(new Error("Failed to load video metadata"));
    video.src = URL.createObjectURL(file);
  });
}
