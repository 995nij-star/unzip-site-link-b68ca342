import { useState, useRef, useEffect, useCallback } from "react";
import { useClipsFeed, useClipActions } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Eye, Flag, ChevronUp, ChevronDown, Volume2, VolumeX
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ReportClipDialog } from "@/components/clips/ReportClipDialog";
import type { GamingClip } from "@/hooks/useClips";

export default function ClipsReels() {
  const { clips, isLoading } = useClipsFeed();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reportClipId, setReportClipId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= clips.length) return;
    setCurrentIndex(idx);
  }, [clips.length]);

  // Handle keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") scrollToIndex(currentIndex + 1);
      if (e.key === "ArrowUp" || e.key === "k") scrollToIndex(currentIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, scrollToIndex]);

  // Handle touch swipe
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) scrollToIndex(currentIndex + 1);
      else scrollToIndex(currentIndex - 1);
    }
  };

  // Handle wheel
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (wheelTimeout.current) return;
    wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null; }, 500);
    if (e.deltaY > 0) scrollToIndex(currentIndex + 1);
    else scrollToIndex(currentIndex - 1);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white font-rajdhani text-lg">No clips available</p>
        <Link to="/clips" className="text-primary font-rajdhani underline">Go back</Link>
      </div>
    );
  }

  const clip = clips[currentIndex];

  return (
    <div
      ref={containerRef}
      className="h-screen bg-black relative overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Back button */}
      <Link to="/clips" className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
        <ArrowLeft className="w-5 h-5 text-white" />
      </Link>

      {/* Counter */}
      <div className="absolute top-4 right-4 z-50 px-3 py-1 rounded-full bg-black/50 backdrop-blur text-white text-xs font-rajdhani">
        {currentIndex + 1} / {clips.length}
      </div>

      {/* Video */}
      <ReelVideo key={clip.id} clip={clip} isActive={true} />

      {/* Right side actions */}
      <ReelActions clip={clip} onReport={() => setReportClipId(clip.id)} />

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-40 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <Link to={`/creator/${clip.user_id}`} className="flex items-center gap-2 mb-2">
          <Avatar className="w-8 h-8 border border-white/30">
            <AvatarImage src={clip.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/20 text-white font-orbitron text-xs">
              {(clip.profile?.username || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-rajdhani font-semibold text-white text-sm">{clip.profile?.username || "User"}</span>
        </Link>
        <p className="font-orbitron font-bold text-white text-sm">{clip.title}</p>
        {clip.description && <p className="text-xs text-white/70 font-rajdhani mt-1 line-clamp-2">{clip.description}</p>}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button onClick={() => scrollToIndex(currentIndex - 1)} className="absolute top-1/2 -translate-y-full left-1/2 -translate-x-1/2 z-40 text-white/40 hover:text-white transition-colors hidden md:block">
          <ChevronUp className="w-8 h-8" />
        </button>
      )}
      {currentIndex < clips.length - 1 && (
        <button onClick={() => scrollToIndex(currentIndex + 1)} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 text-white/40 hover:text-white transition-colors hidden md:block">
          <ChevronDown className="w-8 h-8" />
        </button>
      )}

      {reportClipId && <ReportClipDialog clipId={reportClipId} open={!!reportClipId} onOpenChange={(o) => !o && setReportClipId(null)} />}
    </div>
  );
}

function ReelVideo({ clip, isActive }: { clip: GamingClip; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, clip.id]);

  return (
    <div className="h-full w-full flex items-center justify-center bg-black relative">
      <video
        ref={videoRef}
        src={clip.video_url}
        className="h-full w-full object-contain"
        loop
        muted={muted}
        playsInline
        preload="auto"
        onClick={() => {
          if (videoRef.current?.paused) videoRef.current.play();
          else videoRef.current?.pause();
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center mt-12"
      >
        {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
      </button>
    </div>
  );
}

function ReelActions({ clip, onReport }: { clip: GamingClip; onReport: () => void }) {
  const { toggleLike } = useClipActions();
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return;
    try { await toggleLike.mutateAsync({ clipId: clip.id, isLiked: clip.is_liked }); } catch {}
  };

  const handleShare = () => {
    const url = `${window.location.origin}/c/${clip.short_code || clip.id}`;
    if (navigator.share) { navigator.share({ title: clip.title, url }); }
    else { navigator.clipboard.writeText(url); toast({ title: "Link copied!" }); }
  };

  return (
    <div className="absolute right-3 bottom-32 z-40 flex flex-col items-center gap-5">
      <button onClick={handleLike} className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <Heart className={`w-6 h-6 ${clip.is_liked ? "fill-destructive text-destructive" : "text-white"}`} />
        </div>
        <span className="text-white text-xs font-rajdhani">{clip.likes_count}</span>
      </button>

      <button className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-rajdhani">{clip.comments_count}</span>
      </button>

      <button onClick={handleShare} className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-rajdhani">Share</span>
      </button>

      <div className="flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <span className="text-white text-xs font-rajdhani">{clip.views}</span>
      </div>

      {user && (
        <button onClick={onReport} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Flag className="w-5 h-5 text-white/70" />
          </div>
        </button>
      )}
    </div>
  );
}
