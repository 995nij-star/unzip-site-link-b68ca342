import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Film, Eye, Heart, Search, Pencil, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClipRow {
  id: string;
  title: string;
  user_id: string;
  views: number;
  duration: number;
  created_at: string;
  video_url: string;
  username?: string;
  likes_count: number;
}

export default function AdminClipsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editClip, setEditClip] = useState<ClipRow | null>(null);
  const [editViews, setEditViews] = useState(0);
  const [editLikes, setEditLikes] = useState(0);

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ["admin-clips"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gaming_clips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!data) return [];

      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.username]));

      // Get likes counts
      const clipIds = data.map((c: any) => c.id);
      const { data: likes } = await supabase
        .from("clip_likes")
        .select("clip_id");

      const likesMap: Record<string, number> = {};
      (likes || []).forEach((l: any) => {
        likesMap[l.clip_id] = (likesMap[l.clip_id] || 0) + 1;
      });

      return data.map((c: any) => ({
        ...c,
        username: profileMap.get(c.user_id) || "Unknown",
        likes_count: likesMap[c.id] || 0,
      })) as ClipRow[];
    },
  });

  const updateViewsMutation = useMutation({
    mutationFn: async ({ clipId, views }: { clipId: string; views: number }) => {
      const { error } = await supabase
        .from("gaming_clips")
        .update({ views } as any)
        .eq("id", clipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clips"] });
      toast({ title: "Views updated" });
    },
    onError: () => toast({ title: "Failed to update views", variant: "destructive" }),
  });

  const handleOpenEdit = (clip: ClipRow) => {
    setEditClip(clip);
    setEditViews(clip.views);
    setEditLikes(clip.likes_count);
  };

  const handleSave = async () => {
    if (!editClip) return;
    await updateViewsMutation.mutateAsync({ clipId: editClip.id, views: editViews });
    // Note: likes are managed via clip_likes table rows, showing count for reference
    setEditClip(null);
  };

  const filtered = clips.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Clips Manager">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-orbitron font-bold text-foreground flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" /> Clips Manager
          </h1>
          <Badge variant="outline" className="font-rajdhani">{clips.length} clips</Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((clip) => (
              <div
                key={clip.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-orbitron font-bold text-sm text-foreground truncate">{clip.title}</p>
                  <p className="text-xs text-muted-foreground font-rajdhani">
                    by {clip.username} · {format(new Date(clip.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" /> {clip.views}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="w-3.5 h-3.5" /> {clip.likes_count}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(clip)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground font-rajdhani py-8">No clips found</p>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editClip} onOpenChange={(open) => !open && setEditClip(null)}>
        <DialogContent className="sm:max-w-md bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-primary">Edit Clip Stats</DialogTitle>
            <DialogDescription className="font-rajdhani">
              {editClip?.title} by {editClip?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-rajdhani flex items-center gap-2">
                <Eye className="w-4 h-4" /> Views
              </Label>
              <Input
                type="number"
                min={0}
                value={editViews}
                onChange={(e) => setEditViews(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-rajdhani flex items-center gap-2">
                <Heart className="w-4 h-4" /> Likes (read-only, managed by users)
              </Label>
              <Input type="number" value={editLikes} disabled className="opacity-60" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditClip(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateViewsMutation.isPending}>
              {updateViewsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
