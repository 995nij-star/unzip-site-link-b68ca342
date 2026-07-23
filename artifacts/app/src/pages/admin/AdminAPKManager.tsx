import { useState, useEffect } from "react";
import { Upload, Package, Trash2, FileDown, RefreshCw, Check } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ApkRelease {
  id: string;
  version: string;
  file_size: string;
  file_url: string | null;
  min_android: string;
  release_notes: string | null;
  download_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

const AdminAPKManager = () => {
  const { user } = useAuth();
  const [releases, setReleases] = useState<ApkRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState("1.0.0");
  const [minAndroid, setMinAndroid] = useState("Android 7.0+");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("apk_releases")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setReleases(data as unknown as ApkRelease[]);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".apk")) {
        toast.error("Only .apk files are allowed");
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error("Please select an APK file first");
      return;
    }
    if (!version.trim()) {
      toast.error("Version is required");
      return;
    }

    setUploading(true);
    try {
      const fileName = `xt-esp-v${version}-${Date.now()}.apk`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("apk-files")
        .upload(fileName, selectedFile, {
          contentType: "application/vnd.android.package-archive",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("apk-files")
        .getPublicUrl(fileName);

      // Insert release record
      const { error: dbError } = await (supabase as any).from("apk_releases").insert({
        version: version.trim(),
        file_size: selectedFile.size,
        file_url: urlData.publicUrl,
        min_android: minAndroid.trim(),
        release_notes: releaseNotes.trim() || null,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast.success(`APK v${version} uploaded successfully!`);
      setSelectedFile(null);
      setVersion("");
      setReleaseNotes("");
      fetchReleases();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (release: ApkRelease) => {
    if (!confirm(`Delete APK v${release.version}?`)) return;

    try {
      // Delete from storage if file_url exists
      if (release.file_url) {
        const path = release.file_url.split("/apk-files/")[1];
        if (path) {
          await supabase.storage.from("apk-files").remove([path]);
        }
      }

      const { error } = await supabase
        .from("apk_releases")
        .delete()
        .eq("id", release.id);
      if (error) throw error;

      toast.success("Release deleted");
      fetchReleases();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <AdminLayout title="APK Manager">
      <div className="space-y-6">
        {/* Upload New APK */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--neon-green)/0.15)] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[hsl(var(--neon-green))]" />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-foreground">Upload New APK</h2>
              <p className="text-xs text-muted-foreground">Upload a new version of the Idexopn Android app</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Version *</label>
              <Input
                placeholder="e.g. 1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Min Android</label>
              <Input
                placeholder="e.g. Android 7.0+"
                value={minAndroid}
                onChange={(e) => setMinAndroid(e.target.value)}
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Release Notes</label>
            <Textarea
              placeholder="What's new in this version..."
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="bg-background/50 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">APK File *</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors bg-background/30">
                  <Package className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "Choose APK file..."}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".apk"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !version.trim()}
            className="gap-2 font-bold"
          >
            {uploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading..." : "Upload APK"}
          </Button>
        </div>

        {/* Existing Releases */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-[hsl(var(--neon-blue))]" />
              <h3 className="font-semibold text-foreground">Published Releases</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchReleases} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : releases.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No APK releases yet. Upload your first one above.
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {releases.map((release, i) => (
                <div key={release.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      i === 0
                        ? "bg-[hsl(var(--neon-green)/0.15)]"
                        : "bg-muted/50"
                    }`}>
                      {i === 0 ? (
                        <Check className="w-5 h-5 text-[hsl(var(--neon-green))]" />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">v{release.version}</span>
                        {i === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--neon-green)/0.15)] text-[hsl(var(--neon-green))]">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{release.file_size}</span>
                        <span>•</span>
                        <span>{new Date(release.updated_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{release.download_count} downloads</span>
                      </div>
                      {release.release_notes && (
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate max-w-md">
                          {release.release_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleDelete(release)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAPKManager;
