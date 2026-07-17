import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { LogIn, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useLoginPageSettings, LoginPageSettings } from "@/hooks/useLoginPageSettings";

// HSL "H S% L%" <-> HEX helpers
function hslToHex(hsl: string): string {
  if (!hsl) return "#a855f7";
  const p = hsl.trim().split(/\s+/);
  if (p.length < 3) return "#a855f7";
  const h = parseFloat(p[0]) / 360;
  const s = parseFloat(p[1]) / 100;
  const l = parseFloat(p[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const pp = 2 * l - q;
    r = hue2rgb(pp, q, h + 1 / 3);
    g = hue2rgb(pp, q, h);
    b = hue2rgb(pp, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  if (hex.length !== 6) return "270 100% 65%";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="h-10 w-14 rounded cursor-pointer bg-transparent border border-border"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="H S% L%" className="font-mono text-xs" />
      </div>
    </div>
  );
}

export function LoginPageSettingsCard() {
  const { settings, isUpdating, updateSettings } = useLoginPageSettings();
  const [local, setLocal] = useState<LoginPageSettings>(settings);

  useEffect(() => { setLocal(settings); }, [settings]);

  const set = <K extends keyof LoginPageSettings>(k: K, v: LoginPageSettings[K]) =>
    setLocal((s) => ({ ...s, [k]: v }));

  const save = () => {
    updateSettings(local, {
      onSuccess: () => toast.success("Login page settings saved"),
      onError: (e: any) => toast.error(e?.message || "Failed to save"),
    } as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" /> Login Page
        </CardTitle>
        <CardDescription>
          Customize the public login page. Changes apply instantly across all devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Feature toggles */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Features</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ["showGoogleLogin", "Google Login"],
              ["showEmailLogin", "Email Login"],
              ["showRegister", "Register Button"],
              ["showForgotPassword", "Forgot Password"],
              ["showRememberMe", "Remember Me"],
              ["showDarkModeToggle", "Dark Mode Toggle"],
              ["showLanguageSelector", "Language Selector"],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label className="cursor-pointer">{label}</Label>
                <Switch
                  checked={local[k as keyof LoginPageSettings] as boolean}
                  onCheckedChange={(v) => set(k as any, v as any)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Copy */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Welcome Title</Label>
            <Input value={local.welcomeTitle} onChange={(e) => set("welcomeTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Welcome Subtitle</Label>
            <Input value={local.welcomeSubtitle} onChange={(e) => set("welcomeSubtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hero Kicker</Label>
            <Input value={local.heroKicker} onChange={(e) => set("heroKicker", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hero Title</Label>
            <Input value={local.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Hero Subtitle</Label>
            <Textarea value={local.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Footer Text</Label>
            <Input value={local.footerText} onChange={(e) => set("footerText", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={local.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value || null)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Background Image URL</Label>
            <Input value={local.backgroundImageUrl || ""} onChange={(e) => set("backgroundImageUrl", e.target.value || null)} placeholder="https://..." />
          </div>
        </section>

        {/* Colors */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Theme Colors</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ColorField label="Primary" value={local.primaryColor} onChange={(v) => set("primaryColor", v)} />
            <ColorField label="Accent" value={local.accentColor} onChange={(v) => set("accentColor", v)} />
            <ColorField label="Button Gradient From" value={local.buttonGradientFrom} onChange={(v) => set("buttonGradientFrom", v)} />
            <ColorField label="Button Gradient To" value={local.buttonGradientTo} onChange={(v) => set("buttonGradientTo", v)} />
          </div>
        </section>

        {/* Glass card */}
        <section>
          <h3 className="text-sm font-semibold mb-3">Glass Card Style</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Transparency ({(local.glassOpacity * 100).toFixed(0)}%)</Label>
              <Slider
                value={[local.glassOpacity * 100]}
                onValueChange={([v]) => set("glassOpacity", v / 100)}
                min={10} max={100} step={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Blur ({local.glassBlur}px)</Label>
              <Slider
                value={[local.glassBlur]}
                onValueChange={([v]) => set("glassBlur", v)}
                min={0} max={60} step={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Border Glow ({(local.borderGlow * 100).toFixed(0)}%)</Label>
              <Slider
                value={[local.borderGlow * 100]}
                onValueChange={([v]) => set("borderGlow", v / 100)}
                min={0} max={100} step={5}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={isUpdating} className="gap-2">
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Login Page Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
