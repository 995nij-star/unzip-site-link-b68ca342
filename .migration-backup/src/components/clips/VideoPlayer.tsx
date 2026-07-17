import { useRef, useState, useEffect, useCallback } from "react";
import { Settings, Check, Loader2 } from "lucide-react";

const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  "2160": "4K (2160p)",
  "1440": "QHD (1440p)",
  "1080": "Full HD (1080p)",
  "720": "HD (720p)",
  "480": "SD (480p)",
  "360": "Low (360p)",
};

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  maxHeight?: string;
  lazy?: boolean;
  poster?: string;
}

export function VideoPlayer({
  src,
  autoPlay = false,
  loop = false,
  muted = false,
  className = "",
  maxHeight = "500px",
  lazy = false,
  poster,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [showQuality, setShowQuality] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [videoResolution, setVideoResolution] = useState<{ w: number; h: number } | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (!lazy || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Detect video resolution
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setVideoResolution({ w: video.videoWidth, h: video.videoHeight });
    }
  }, []);

  // Buffering state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [isVisible]);

  const getAvailableQualities = () => {
    if (!videoResolution) return ["auto"];
    const h = videoResolution.h;
    const qualities = ["auto"];
    if (h >= 2160) qualities.push("2160");
    if (h >= 1440) qualities.push("1440");
    if (h >= 1080) qualities.push("1080");
    if (h >= 720) qualities.push("720");
    if (h >= 480) qualities.push("480");
    qualities.push("360");
    return qualities;
  };

  const availableQualities = getAvailableQualities();

  return (
    <div ref={containerRef} className={`relative bg-black group ${className}`} style={{ maxHeight }}>
      {!isVisible ? (
        <div className="w-full aspect-video bg-muted/20 flex items-center justify-center" style={{ maxHeight }}>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={src}
            controls
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            preload={lazy ? "metadata" : "auto"}
            playsInline
            poster={poster}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full object-contain"
            style={{ maxHeight }}
          />

          {/* Buffering indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            </div>
          )}

          {/* Quality selector */}
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setShowQuality(!showQuality); }}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Settings className="w-4 h-4" />
            </button>

            {showQuality && (
              <div className="absolute top-10 right-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px] z-50">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-orbitron font-bold text-foreground">Quality</p>
                </div>
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQuality(q);
                      setShowQuality(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-rajdhani transition-colors ${
                      selectedQuality === q
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {selectedQuality === q && <Check className="w-3 h-3" />}
                    <span className={selectedQuality !== q ? "ml-5" : ""}>{QUALITY_LABELS[q] || q}</span>
                  </button>
                ))}
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground font-rajdhani">
                    Source: {videoResolution ? `${videoResolution.w}×${videoResolution.h}` : "Detecting..."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resolution badge */}
          {videoResolution && (
            <div className="absolute bottom-12 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] text-white font-rajdhani">
                {selectedQuality === "auto"
                  ? `${videoResolution.h}p`
                  : `${selectedQuality}p`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
