import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void;
}

export function ProfileEditDialog({ open, onOpenChange, onProfileUpdated }: ProfileEditDialogProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [username, setUsername] = useState(profile?.username || "");
  const [freeFireUid, setFreeFireUid] = useState(profile?.free_fire_uid || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayName = profile?.username || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache buster to force refresh
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      
      toast({
        title: "Avatar uploaded",
        description: "Your avatar has been uploaded. Click Save to apply changes.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate username
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      toast({
        title: "Invalid username",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    if (trimmedUsername.length > 20) {
      toast({
        title: "Invalid username",
        description: "Username must be less than 20 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: trimmedUsername,
          free_fire_uid: freeFireUid.trim() || null,
          gender: gender || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
      
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Sync state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && profile) {
      setUsername(profile.username || "");
      setFreeFireUid(profile.free_fire_uid || "");
      setGender(profile.gender || "");
      setAvatarUrl(profile.avatar_url || "");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-xl text-primary">
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your username and avatar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-primary/50">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Click to upload a new avatar (max 2MB)
            </p>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username" className="font-rajdhani text-sm text-muted-foreground">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={20}
              className="bg-background/50 border-primary/30 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              3-20 characters
            </p>
          </div>

          {/* Free Fire UID Input */}
          <div className="space-y-2">
            <Label htmlFor="freeFireUid" className="font-rajdhani text-sm text-muted-foreground">
              Free Fire UID
            </Label>
            <Input
              id="freeFireUid"
              value={freeFireUid}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                setFreeFireUid(value);
              }}
              placeholder="Enter your Free Fire UID"
              maxLength={12}
              className="bg-background/50 border-primary/30 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Your in-game Free Fire UID (visible to other players)
            </p>
          </div>

          {/* Gender Select */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="font-rajdhani text-sm text-muted-foreground">
              Gender
            </Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="bg-background/50 border-primary/30 focus:border-primary">
                <SelectValue placeholder="Select gender (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional · visible on your profile
            </p>
          </div>

          {/* UID Display */}
          <div className="space-y-2">
            <Label className="font-rajdhani text-sm text-muted-foreground">
              Your UID
            </Label>
            <div className="p-3 rounded-lg bg-background/50 border border-primary/30">
              <p className="font-orbitron font-bold text-primary tracking-widest">
                {profile?.uid ?? "—"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your unique ID cannot be changed
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-primary/30"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
