import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClipActions } from "@/hooks/useClips";
import { MobileNav } from "@/components/MobileNav";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Monitor, Circle, Square, Download, Upload, Loader2, Trash2, Clock, Play, Pause,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ScreenRecord() {
  const navigate = useNavigate();
  const { uploadClip } = useClipActions();

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const stopAllTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const isScreenCaptureSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  const openVideoPicker = () => {
    fileInputRef.current?.click();
  };

  const handleVideoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please choose a valid video file.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setRecordedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setElapsed(0);
    setPaused(false);
    setRecording(false);
    setUploadOpen(true);

    event.target.value = "";
  };

  const startRecording = async () => {
    if (!isScreenCaptureSupported) {
      toast({
        title: "Not supported on this device",
        description: "Screen recording requires a desktop browser (Chrome, Edge, or Firefox). Please open this page on a computer.",
        variant: "destructive",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      streamRef.current = stream;

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecording();
      });

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopAllTracks();
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(1000);
      setRecording(true);
      setPaused(false);
      setElapsed(0);
      setRecordedBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        toast({ title: "Screen share failed", description: err.message, variant: "destructive" });
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const togglePause = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (rec.state === "paused") {
      rec.resume();
      setPaused(false);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(recordedBlob);
    a.download = `screen-recording-${Date.now()}.webm`;
    a.click();
  };

  const discardRecording = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
  };

  const handleUpload = async () => {
    if (!recordedBlob || !title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const file = new File([recordedBlob], `screen-${Date.now()}.webm`, { type: recordedBlob.type });
      await uploadClip.mutateAsync({ title: title.trim(), description: description.trim() || undefined, file });
      toast({ title: "Clip uploaded!", description: "Your screen recording has been uploaded." });
      setUploadOpen(false);
      discardRecording();
      setTitle("");
      setDescription("");
      navigate("/clips");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link to="/streams" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Monitor className="w-6 h-6 text-primary" />
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Screen Record</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoSelect}
        />

        {/* Recording Controls */}
        <div className="premium-card rounded-2xl p-6 mb-6">
          <div className="text-center space-y-6">
            {/* Timer */}
            <div className="flex items-center justify-center gap-2">
              {recording && (
                <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              )}
              <span className="text-4xl font-orbitron font-bold text-foreground tabular-nums">
                {formatTime(elapsed)}
              </span>
              {recording && (
                <Badge variant="outline" className="text-destructive border-destructive/30 font-rajdhani">
                  {paused ? "PAUSED" : "REC"}
                </Badge>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {!recording && !recordedBlob && isScreenCaptureSupported && (
                <CyberButton onClick={startRecording} className="gap-2 px-8">
                  <Circle className="w-5 h-5 fill-destructive text-destructive" />
                  Start Recording
                </CyberButton>
              )}

              {!recording && !recordedBlob && !isScreenCaptureSupported && (
                <CyberButton onClick={openVideoPicker} className="gap-2 px-8">
                  <Upload className="w-5 h-5" />
                  Select Recording to Upload
                </CyberButton>
              )}

              {recording && (
                <>
                  <CyberButton variant="outline" onClick={togglePause} className="gap-2">
                    {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {paused ? "Resume" : "Pause"}
                  </CyberButton>
                  <CyberButton variant="destructive" onClick={stopRecording} className="gap-2">
                    <Square className="w-4 h-4 fill-current" />
                    Stop
                  </CyberButton>
                </>
              )}
            </div>

            {!isScreenCaptureSupported && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive font-rajdhani max-w-md mx-auto">
                ⚠️ Direct screen capture is not supported on this device. Record with your phone's built-in screen recorder, then tap “Select Recording to Upload”.
              </div>
            )}
            {isScreenCaptureSupported && !recording && !recordedBlob && (
              <p className="text-sm text-muted-foreground font-rajdhani max-w-md mx-auto">
                Share your screen and record gameplay. You can then upload the recording as a clip for everyone to see.
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        {previewUrl && recordedBlob && (
          <div className="premium-card rounded-2xl overflow-hidden mb-6">
            <video
              ref={videoPreviewRef}
              src={previewUrl}
              controls
              onLoadedMetadata={(e) => {
                const durationSeconds = Math.floor(e.currentTarget.duration || 0);
                if (durationSeconds > 0) {
                  setElapsed(durationSeconds);
                }
              }}
              className="w-full aspect-video bg-black"
            />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-rajdhani">
                <Clock className="w-4 h-4" />
                <span>Duration: {formatTime(elapsed)}</span>
                <span className="mx-2">·</span>
                <span>Size: {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
              <div className="flex gap-3">
                <CyberButton onClick={() => setUploadOpen(true)} className="flex-1 gap-2">
                  <Upload className="w-4 h-4" />
                  Upload as Clip
                </CyberButton>
                <CyberButton variant="outline" onClick={downloadRecording} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </CyberButton>
                <CyberButton variant="destructive" onClick={discardRecording} size="icon">
                  <Trash2 className="w-4 h-4" />
                </CyberButton>
              </div>
            </div>
          </div>
        )}

        {/* Info card */}
        {!recording && !recordedBlob && (
          <div className="premium-card rounded-2xl p-6">
            <h3 className="font-orbitron font-bold text-foreground text-sm mb-3">How it works</h3>
            <ul className="premium-list has-custom-marker text-sm text-muted-foreground font-rajdhani">
              {isScreenCaptureSupported ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    Click "Start Recording" and select your screen or window
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    Play your game — the recording captures everything
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    Stop recording, preview it, then upload as a clip or download
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    Use your phone's built-in screen recorder while playing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    Tap "Select Recording to Upload" and choose the recorded video
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    Add title/description, upload, and share the clip with everyone
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card border-primary/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-primary">Upload Recording</DialogTitle>
            <DialogDescription className="font-rajdhani">
              Give your screen recording a title and upload it as a clip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <CyberInput
              placeholder="Clip title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <CyberInput
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <CyberButton onClick={handleUpload} className="w-full gap-2" disabled={uploading || !title.trim()}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload Clip"}
            </CyberButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
