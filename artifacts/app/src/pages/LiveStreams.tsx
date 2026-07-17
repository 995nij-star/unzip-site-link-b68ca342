import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStreams, useStreamActions, LiveStream } from "@/hooks/useStreams";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import {
  Gamepad2, Radio, Plus, Users, Eye, ArrowLeft, Loader2, ExternalLink, Trash2, Monitor
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { CyberInput } from "@/components/ui/cyber-input";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function extractVideoId(url: string): { id: string; platform: string } | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { id: ytMatch[1], platform: "youtube" };
  // Twitch
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch) return { id: twitchMatch[1], platform: "twitch" };
  return null;
}

function getThumbnail(url: string): string | null {
  const info = extractVideoId(url);
  if (info?.platform === "youtube") return `https://img.youtube.com/vi/${info.id}/hqdefault.jpg`;
  return null;
}

function DeleteStreamButton({ stream, onDelete }: { stream: LiveStream; onDelete: (id: string) => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border" onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-orbitron">Delete Stream</AlertDialogTitle>
          <AlertDialogDescription className="font-rajdhani">
            This will permanently delete "{stream.title}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-rajdhani"
            onClick={() => onDelete(stream.id)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function LiveStreams() {
  const { streams, isLoading } = useStreams();
  const { createStream, deleteStream } = useStreamActions();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", stream_url: "" });

  const liveStreams = streams.filter(s => s.is_live);
  const pastStreams = streams.filter(s => !s.is_live);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.stream_url.trim()) {
      toast({ title: "Error", description: "Title and stream URL are required", variant: "destructive" });
      return;
    }
    const info = extractVideoId(form.stream_url);
    if (!info) {
      toast({ title: "Invalid URL", description: "Please paste a valid YouTube or Twitch stream URL", variant: "destructive" });
      return;
    }
    try {
      await createStream.mutateAsync({
        title: form.title,
        description: form.description,
        stream_url: form.stream_url,
        platform: info.platform,
      });
      setCreateOpen(false);
      setForm({ title: "", description: "", stream_url: "" });
      toast({ title: "Stream created!", description: "Your live stream is now visible to everyone." });
    } catch {
      toast({ title: "Error", description: "Failed to create stream", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Radio className="w-6 h-6 text-neon-red" />
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Live Streams</span>
          </div>
          <div className="flex items-center gap-3">
            <CyberButton size="sm" variant="outline" onClick={() => navigate("/screen-record")} className="gap-1">
              <Monitor className="w-4 h-4" /> Record Screen
            </CyberButton>
            <CyberButton size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Go Live
            </CyberButton>
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Live Now */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 bg-neon-red rounded-full animate-pulse" />
          <h2 className="text-xl font-orbitron font-bold text-foreground">Live Now</h2>
          <Badge className="bg-neon-red/20 text-neon-red border-neon-red/30 text-xs">{liveStreams.length}</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-neon-blue" /></div>
        ) : liveStreams.length === 0 ? (
          <div className="text-center py-12 premium-card rounded-2xl">
            <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-rajdhani text-lg">No one is streaming right now</p>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">Be the first to go live!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {liveStreams.map((stream) => (
              <div
                key={stream.id}
                className="text-left premium-card rounded-xl overflow-hidden hover:border-neon-red/50 transition-all group cursor-pointer"
                onClick={() => navigate(`/streams/${stream.id}`)}
              >
                <div className="relative aspect-video bg-muted">
                  {getThumbnail(stream.stream_url) ? (
                    <img src={getThumbnail(stream.stream_url)!} alt={stream.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neon-purple/20 to-neon-blue/20">
                      <Gamepad2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-neon-red text-white border-none text-xs font-rajdhani">
                    <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" /> LIVE
                  </Badge>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded px-2 py-0.5">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-rajdhani">{stream.viewer_count}</span>
                  </div>
                </div>
                <div className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-orbitron font-bold text-foreground text-sm truncate group-hover:text-neon-cyan transition-colors">
                      {stream.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-rajdhani mt-1 truncate">
                      {stream.description || "Gaming stream"}
                    </p>
                  </div>
                  {user && stream.user_id === user.id && (
                    <DeleteStreamButton stream={stream} onDelete={(id) => deleteStream.mutate(id, {
                      onSuccess: () => toast({ title: "Stream deleted" }),
                      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
                    })} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past Streams */}
        {pastStreams.length > 0 && (
          <>
            <h2 className="text-lg font-orbitron font-bold text-foreground mb-4 mt-8">Past Streams</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastStreams.slice(0, 6).map((stream) => (
                <div
                  key={stream.id}
                  className="text-left premium-card rounded-xl overflow-hidden hover:border-border transition-all opacity-70 hover:opacity-100 cursor-pointer"
                  onClick={() => navigate(`/streams/${stream.id}`)}
                >
                  <div className="relative aspect-video bg-muted">
                    {getThumbnail(stream.stream_url) ? (
                      <img src={getThumbnail(stream.stream_url)!} alt={stream.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Gamepad2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-muted text-muted-foreground border-border text-xs">Ended</Badge>
                  </div>
                  <div className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-orbitron font-bold text-foreground text-xs truncate">{stream.title}</h3>
                      <p className="text-xs text-muted-foreground font-rajdhani mt-0.5">
                        {stream.ended_at ? format(new Date(stream.ended_at), "MMM dd, HH:mm") : ""}
                      </p>
                    </div>
                    {user && stream.user_id === user.id && (
                      <DeleteStreamButton stream={stream} onDelete={(id) => deleteStream.mutate(id, {
                        onSuccess: () => toast({ title: "Stream deleted" }),
                        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
                      })} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create Stream Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Go Live</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <CyberInput
              placeholder="Stream title"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <CyberInput
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <CyberInput
              placeholder="YouTube or Twitch stream URL"
              value={form.stream_url}
              onChange={(e) => setForm(f => ({ ...f, stream_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground font-rajdhani">
              Paste your YouTube Live or Twitch stream URL. Example: https://youtube.com/watch?v=...
            </p>
            <CyberButton onClick={handleCreate} className="w-full" disabled={createStream.isPending}>
              {createStream.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Radio className="w-4 h-4 mr-2" />}
              Start Stream
            </CyberButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
