import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSiteSettings, usePaymentSettings, ThemeSettings, PaymentSettings, fontOptions } from "@/hooks/useSiteSettings";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { useGlobalCredentials } from "@/hooks/useGlobalCredentials";
import { useAISettings } from "@/hooks/useAISettings";
import { useVideoSettings, VideoSettings } from "@/hooks/useVideoSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Trash2, Palette, Image, Sun, Moon, Type, CreditCard, QrCode, ShieldCheck, AlertTriangle, Key, Bot, Film, Tag } from "lucide-react";
import { useAppVersion, useUpdateAppVersion } from "@/hooks/useAppVersion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoginPageSettingsCard } from "@/components/admin/LoginPageSettingsCard";

function ColorPicker({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}) {
  // Convert HSL string to hex for color input
  const hslToHex = (hsl: string) => {
    if (!hsl || typeof hsl !== "string") return "#3b82f6";
    const parts = hsl.trim().split(/\s+/);
    if (parts.length < 3) return "#3b82f6";

    
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return value;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-rajdhani">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <Input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-16 h-10 p-1 cursor-pointer border-border"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="210 100% 55%"
        />
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { theme, updateTheme, isUpdating, uploadAsset, isLoading } = useSiteSettings();
  const { payment, updatePayment, isUpdating: isPaymentUpdating, uploadQrCode, isLoading: isPaymentLoading } = usePaymentSettings();
  const { credentials: globalCreds, updateCredentials, isUpdating: isCredsUpdating, isLoading: isCredsLoading } = useGlobalCredentials();
  const { security, updateSecurity, isUpdating: isSecurityUpdating, isLoading: isSecurityLoading } = useSecuritySettings();
  const { aiSettings, updateAISettings, isUpdating: isAIUpdating, isLoading: isAILoading } = useAISettings();
  const { settings: videoSettings, updateSettings: updateVideoSettings, isUpdating: isVideoUpdating, isLoading: isVideoLoading } = useVideoSettings();
  const [localTheme, setLocalTheme] = useState<ThemeSettings | null>(null);
  const [localPayment, setLocalPayment] = useState<PaymentSettings | null>(null);
  const [localSystemPrompt, setLocalSystemPrompt] = useState<string | null>(null);
  const [localVideoSettings, setLocalVideoSettings] = useState<VideoSettings | null>(null);
  const [uploading, setUploading] = useState<"logo" | "banner" | "qrcode" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // App version
  const { data: appVersion } = useAppVersion();
  const updateAppVersion = useUpdateAppVersion();
  const [versionInput, setVersionInput] = useState("");
  const [releaseNotesInput, setReleaseNotesInput] = useState("");

  useEffect(() => {
    if (appVersion) {
      setVersionInput(appVersion.version);
      setReleaseNotesInput(appVersion.release_notes);
    }
  }, [appVersion]);

  const handleSaveVersion = () => {
    const v = versionInput.trim();
    if (!v) {
      toast.error("Version cannot be empty");
      return;
    }
    updateAppVersion.mutate(
      { version: v, release_notes: releaseNotesInput },
      {
        onSuccess: () => toast.success(`App version updated to v${v}`),
        onError: (err: any) => toast.error(err?.message || "Failed to update version"),
      }
    );
  };

  const currentVideoSettings = localVideoSettings || videoSettings;

  // Use local state or fetched data
  const currentTheme = localTheme || theme;
  const currentPayment = localPayment || payment;

  const handleChange = (key: keyof ThemeSettings, value: string | boolean | null) => {
    setLocalTheme((prev) => ({
      ...(prev || theme),
      [key]: value,
    }));
  };

  const handlePaymentChange = (key: keyof PaymentSettings, value: string | null) => {
    setLocalPayment((prev) => ({
      ...(prev || payment),
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (localTheme) {
      updateTheme(localTheme, {
        onSuccess: () => {
          toast.success("Theme settings saved successfully!");
          setLocalTheme(null);
        },
        onError: () => {
          toast.error("Failed to save theme settings");
        },
      });
    }
  };

  const handleSavePayment = () => {
    if (localPayment) {
      updatePayment(localPayment, {
        onSuccess: () => {
          toast.success("Payment settings saved successfully!");
          setLocalPayment(null);
        },
        onError: () => {
          toast.error("Failed to save payment settings");
        },
      });
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "banner" | "qrcode"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploading(type);
    try {
      if (type === "qrcode") {
        const url = await uploadQrCode(file);
        handlePaymentChange("qrCodeUrl", url);
        toast.success("QR Code uploaded successfully!");
      } else {
        const url = await uploadAsset(file, type);
        handleChange(type === "logo" ? "logoUrl" : "bannerUrl", url);
        toast.success(`${type === "logo" ? "Logo" : "Banner"} uploaded successfully!`);
      }
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (type: "logo" | "banner") => {
    handleChange(type === "logo" ? "logoUrl" : "bannerUrl", null);
  };

  if (isLoading || isPaymentLoading || isSecurityLoading || isCredsLoading || isAILoading) {
    return (
      <AdminLayout title="Settings" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const hasThemeChanges = localTheme !== null;
  const hasPaymentChanges = localPayment !== null;

  return (
    <AdminLayout title="Settings" description="Customize your platform's appearance">
      <div className="max-w-4xl space-y-6">
        {/* App Version */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <Tag className="w-5 h-5 text-primary" />
              App Version
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Update the version number shown to all users in the dashboard footer.
              {appVersion?.released_at && (
                <span className="block mt-1 text-xs">
                  Last released: {new Date(appVersion.released_at).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[200px_1fr]">
              <div className="space-y-2">
                <Label className="text-foreground font-rajdhani">Version</Label>
                <Input
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="1.0.0"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-rajdhani">Release Notes (optional)</Label>
                <Textarea
                  value={releaseNotesInput}
                  onChange={(e) => setReleaseNotesInput(e.target.value)}
                  placeholder="What's new in this release..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground font-rajdhani">
                Current live version:{" "}
                <span className="font-mono text-foreground">v{appVersion?.version || "—"}</span>
              </p>
              <Button
                onClick={handleSaveVersion}
                disabled={updateAppVersion.isPending}
              >
                {updateAppVersion.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Version"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Color Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <Palette className="w-5 h-5 text-primary" />
              Color Scheme
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Customize your platform's color palette
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <ColorPicker
              label="Primary Color"
              value={currentTheme.primaryColor}
              onChange={(v) => handleChange("primaryColor", v)}
              description="Main accent color for buttons and highlights"
            />
            <ColorPicker
              label="Secondary Color"
              value={currentTheme.secondaryColor}
              onChange={(v) => handleChange("secondaryColor", v)}
              description="Secondary UI elements and backgrounds"
            />
            <ColorPicker
              label="Background Color"
              value={currentTheme.backgroundColor}
              onChange={(v) => handleChange("backgroundColor", v)}
              description="Main page background color"
            />
            <ColorPicker
              label="Button Color"
              value={currentTheme.buttonColor}
              onChange={(v) => handleChange("buttonColor", v)}
              description="Primary button background color"
            />
          </CardContent>
        </Card>

        {/* Logo & Banner */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <Image className="w-5 h-5 text-primary" />
              Branding
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Upload your logo and banner images
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="text-foreground font-rajdhani">Logo</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {currentTheme.logoUrl ? (
                  <div className="space-y-3">
                    <img
                      src={currentTheme.logoUrl}
                      alt="Logo"
                      className="max-h-20 mx-auto object-contain"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading === "logo"}
                      >
                        {uploading === "logo" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Replace
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage("logo")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer py-6"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploading === "logo" ? (
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload logo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Max 2MB, PNG/JPG
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "logo")}
                />
              </div>
            </div>

            {/* Banner Upload */}
            <div className="space-y-3">
              <Label className="text-foreground font-rajdhani">Banner</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {currentTheme.bannerUrl ? (
                  <div className="space-y-3">
                    <img
                      src={currentTheme.bannerUrl}
                      alt="Banner"
                      className="max-h-20 w-full mx-auto object-cover rounded"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploading === "banner"}
                      >
                        {uploading === "banner" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Replace
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage("banner")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer py-6"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    {uploading === "banner" ? (
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload banner
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Max 2MB, PNG/JPG
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "banner")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <Type className="w-5 h-5 text-primary" />
              Typography
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Customize fonts for headings and body text
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* Heading Font */}
            <div className="space-y-2">
              <Label className="text-foreground font-rajdhani">Heading Font</Label>
              <p className="text-xs text-muted-foreground">Used for titles and headers</p>
              <Select
                value={currentTheme.headingFont}
                onValueChange={(v) => handleChange("headingFont", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select heading font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({font.category})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div 
                className="mt-2 p-3 bg-secondary/50 rounded-lg text-lg"
                style={{ fontFamily: currentTheme.headingFont }}
              >
                Preview Heading Text
              </div>
            </div>

            {/* Body Font */}
            <div className="space-y-2">
              <Label className="text-foreground font-rajdhani">Body Font</Label>
              <p className="text-xs text-muted-foreground">Used for paragraphs and UI text</p>
              <Select
                value={currentTheme.bodyFont}
                onValueChange={(v) => handleChange("bodyFont", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select body font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({font.category})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div 
                className="mt-2 p-3 bg-secondary/50 rounded-lg text-sm"
                style={{ fontFamily: currentTheme.bodyFont }}
              >
                This is how your body text will look. It's used for paragraphs, buttons, and general content.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dark/Light Mode */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              {currentTheme.darkMode ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              Appearance Mode
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Toggle between dark and light mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-foreground font-rajdhani">
                  {currentTheme.darkMode ? "Dark Mode" : "Light Mode"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {currentTheme.darkMode
                    ? "Switch to light mode for a brighter interface"
                    : "Switch to dark mode for a darker interface"}
                </p>
              </div>
              <Switch
                checked={currentTheme.darkMode}
                onCheckedChange={(v) => handleChange("darkMode", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Save Button */}
        <div className="flex justify-end gap-3">
          {hasThemeChanges && (
            <Button
              variant="outline"
              onClick={() => setLocalTheme(null)}
              disabled={isUpdating}
            >
              Discard Changes
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasThemeChanges || isUpdating}
            className="min-w-32"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Theme"
            )}
          </Button>
        </div>

        {/* Payment Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Settings
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Configure UPI ID and QR code for payments
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* UPI ID */}
            <div className="space-y-3">
              <Label className="text-foreground font-rajdhani">UPI ID</Label>
              <p className="text-xs text-muted-foreground">
                This UPI ID will be shown to users for payments
              </p>
              <Input
                type="text"
                value={currentPayment.upiId}
                onChange={(e) => handlePaymentChange("upiId", e.target.value)}
                placeholder="example@upi"
                className="font-mono"
              />
            </div>

            {/* QR Code Upload */}
            <div className="space-y-3">
              <Label className="text-foreground font-rajdhani flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Payment QR Code
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {currentPayment.qrCodeUrl ? (
                  <div className="space-y-3">
                    <img
                      src={currentPayment.qrCodeUrl}
                      alt="Payment QR Code"
                      className="max-h-32 mx-auto object-contain bg-white p-2 rounded"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => qrCodeInputRef.current?.click()}
                        disabled={uploading === "qrcode"}
                      >
                        {uploading === "qrcode" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Replace
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePaymentChange("qrCodeUrl", null)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer py-6"
                    onClick={() => qrCodeInputRef.current?.click()}
                  >
                    {uploading === "qrcode" ? (
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload QR code
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Max 2MB, PNG/JPG
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={qrCodeInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "qrcode")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Save Button */}
        <div className="flex justify-end gap-3">
          {hasPaymentChanges && (
            <Button
              variant="outline"
              onClick={() => setLocalPayment(null)}
              disabled={isPaymentUpdating}
            >
              Discard Changes
            </Button>
          )}
          <Button
            onClick={handleSavePayment}
            disabled={!hasPaymentChanges || isPaymentUpdating}
            className="min-w-32"
          >
            {isPaymentUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Payment Settings"
            )}
          </Button>
        </div>

        {/* Security Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Configure two-factor authentication for all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-foreground font-rajdhani">
                  Two-Factor Authentication (2FA)
                </Label>
                <p className="text-sm text-muted-foreground">
                  {security.twoFactorEnabled
                    ? "Users must verify a 6-digit email code after entering their password"
                    : "Enable to require an email OTP verification step during login"}
                </p>
              </div>
              <Switch
                checked={security.twoFactorEnabled}
                disabled={isSecurityUpdating}
                onCheckedChange={(checked) => {
                  updateSecurity(
                    { twoFactorEnabled: checked },
                    {
                      onSuccess: () => {
                        toast.success(
                          checked
                            ? "2FA enabled — users will now verify via email OTP on login"
                            : "2FA disabled — users can log in with password only"
                        );
                      },
                      onError: () => {
                        toast.error("Failed to update security settings");
                      },
                    }
                  );
                }}
              />
            </div>
          </CardContent>
      </Card>

        {/* Global Credentials */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <Key className="w-5 h-5 text-primary" />
              Global Credentials
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Set a global Room ID & Password visible to all users on the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground font-rajdhani">Label / Title</Label>
              <Input
                value={globalCreds.label}
                onChange={(e) => updateCredentials({ label: e.target.value })}
                placeholder="e.g. Room Credentials"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground font-rajdhani">Room ID</Label>
                <Input
                  value={globalCreds.roomId}
                  onChange={(e) => updateCredentials({ roomId: e.target.value })}
                  placeholder="Enter Room ID"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-rajdhani">Password</Label>
                <Input
                  value={globalCreds.roomPassword}
                  onChange={(e) => updateCredentials({ roomPassword: e.target.value })}
                  placeholder="Enter Password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave both fields empty to hide credentials from the dashboard.
            </p>
          </CardContent>
        </Card>

        {/* AI Assistant Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-foreground">
              <Bot className="w-5 h-5 text-primary" />
              AI Assistant
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Enable or disable the AI assistant and customize its behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-foreground font-rajdhani">
                  Enable AI Assistant
                </Label>
                <p className="text-sm text-muted-foreground">
                  {aiSettings.enabled
                    ? "AI Assistant is active and accessible from the admin sidebar"
                    : "AI Assistant is disabled and hidden from the sidebar"}
                </p>
              </div>
              <Switch
                checked={aiSettings.enabled}
                disabled={isAIUpdating}
                onCheckedChange={(checked) => {
                  updateAISettings(
                    { enabled: checked },
                    {
                      onSuccess: () => {
                        toast.success(checked ? "AI Assistant enabled" : "AI Assistant disabled");
                      },
                      onError: () => {
                        toast.error("Failed to update AI settings");
                      },
                    }
                  );
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-rajdhani">Custom System Prompt</Label>
              <p className="text-xs text-muted-foreground">
                Override the default AI personality and instructions. Leave empty to use the default prompt.
              </p>
              <Textarea
                value={localSystemPrompt ?? aiSettings.systemPrompt}
                onChange={(e) => setLocalSystemPrompt(e.target.value)}
                placeholder="e.g. You are a strict admin assistant. Always respond formally and flag any security concerns..."
                className="min-h-[120px] font-rajdhani"
                rows={5}
              />
              <div className="flex justify-end gap-2 mt-2">
                {localSystemPrompt !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocalSystemPrompt(null)}
                    disabled={isAIUpdating}
                  >
                    Discard
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={localSystemPrompt === null || isAIUpdating}
                  onClick={() => {
                    updateAISettings(
                      { systemPrompt: localSystemPrompt || "" },
                      {
                        onSuccess: () => {
                          toast.success("System prompt saved!");
                          setLocalSystemPrompt(null);
                        },
                        onError: () => toast.error("Failed to save system prompt"),
                      }
                    );
                  }}
                >
                  {isAIUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Save Prompt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Settings */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <Film className="w-5 h-5 text-primary" />
              Video & Clips Settings
            </CardTitle>
            <CardDescription className="font-rajdhani">
              Configure upload limits, supported formats, and resolution settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isVideoLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-rajdhani">Max File Size (MB)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      value={currentVideoSettings.maxFileSizeMB}
                      onChange={(e) => setLocalVideoSettings(prev => ({
                        ...(prev || videoSettings),
                        maxFileSizeMB: parseInt(e.target.value) || 300,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-rajdhani">Max Duration (seconds)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={300}
                      value={currentVideoSettings.maxDurationSeconds}
                      onChange={(e) => setLocalVideoSettings(prev => ({
                        ...(prev || videoSettings),
                        maxDurationSeconds: parseInt(e.target.value) || 60,
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
                  <div>
                    <p className="font-rajdhani font-semibold text-foreground">Allow 4K Uploads</p>
                    <p className="text-xs text-muted-foreground font-rajdhani">Enable uploads up to 3840×2160 resolution</p>
                  </div>
                  <Switch
                    checked={currentVideoSettings.allow4K}
                    onCheckedChange={(checked) => setLocalVideoSettings(prev => ({
                      ...(prev || videoSettings),
                      allow4K: checked,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-rajdhani">Supported Formats</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { mime: "video/mp4", label: "MP4" },
                      { mime: "video/quicktime", label: "MOV" },
                      { mime: "video/webm", label: "WebM" },
                    ].map(({ mime, label }) => {
                      const isEnabled = currentVideoSettings.allowedFormats.includes(mime);
                      return (
                        <button
                          key={mime}
                          onClick={() => {
                            setLocalVideoSettings(prev => {
                              const current = prev || videoSettings;
                              const formats = isEnabled
                                ? current.allowedFormats.filter(f => f !== mime)
                                : [...current.allowedFormats, mime];
                              return { ...current, allowedFormats: formats.length > 0 ? formats : [mime] };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-rajdhani border transition-colors ${
                            isEnabled
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-secondary border-border text-muted-foreground"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {localVideoSettings && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        updateVideoSettings(localVideoSettings);
                        setLocalVideoSettings(null);
                        toast.success("Video settings saved");
                      }}
                      disabled={isVideoUpdating}
                      className="gap-2"
                    >
                      {isVideoUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Video Settings
                    </Button>
                    <Button variant="outline" onClick={() => setLocalVideoSettings(null)}>
                      Discard
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone — Factory Reset */}
        <Card className="bg-card border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="font-rajdhani text-destructive/70">
              Irreversible actions that affect the entire platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
              <div>
                <h4 className="font-semibold text-foreground">Factory Reset</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Delete all users (except your admin account), tournaments, wallets, transactions, announcements, support tickets, and all other data. Your admin account and role will be preserved. <strong>This cannot be undone.</strong>
                </p>
              </div>
              <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setResetConfirmText(""); }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Factory Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Factory Reset — Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>This will permanently delete:</p>
                      <ul className="premium-list-plain pl-1 text-sm">
                        <li>All user accounts (except yours)</li>
                        <li>All tournaments & participants</li>
                        <li>All wallets, transactions, topups & withdrawals</li>
                        <li>All announcements, notifications & support tickets</li>
                        <li>All gift codes & redemptions</li>
                        <li>All ban logs, login history & reports</li>
                      </ul>
                      <p className="font-semibold">Your admin wallet will be reset to ₹100.</p>
                      <div className="pt-2">
                        <Label className="text-sm">Type <span className="font-mono font-bold text-destructive">RESET-ALL</span> to confirm:</Label>
                        <Input
                          value={resetConfirmText}
                          onChange={(e) => setResetConfirmText(e.target.value)}
                          placeholder="RESET-ALL"
                          className="mt-2 font-mono"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={resetConfirmText !== "RESET-ALL" || isResetting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async (e) => {
                        e.preventDefault();
                        setIsResetting(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) {
                            toast.error("You must be logged in");
                            return;
                          }
                          const { data, error } = await supabase.functions.invoke("factory-reset", {
                            body: { confirmCode: "RESET-ALL" },
                          });
                          if (error || !data?.success) {
                            toast.error(data?.error || "Factory reset failed");
                          } else {
                            toast.success("Factory reset completed successfully");
                            setResetDialogOpen(false);
                            setResetConfirmText("");
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Something went wrong");
                        } finally {
                          setIsResetting(false);
                        }
                      }}
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Resetting...
                        </>
                      ) : (
                        "Execute Factory Reset"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <LoginPageSettingsCard />
      </div>
    </AdminLayout>
  );
}

