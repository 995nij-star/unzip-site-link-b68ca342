import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/i18n/translations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Copy, Check, Pencil, History, Globe, Sun, Moon, MapPin } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginHistorySection } from "@/components/LoginHistorySection";

export function ProfileDropdown() {
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const { language, setLanguage, t, languageNames } = useLanguage();
  const { isDark, setUserDarkMode } = useTheme();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("India");

  // Load country from profile on mount
  useEffect(() => {
    if (profile?.country) {
      setSelectedCountry(profile.country);
    }
  }, [profile?.country]);

  const countries = [
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
    { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
    { code: "NP", name: "Nepal", flag: "🇳🇵" },
    { code: "PK", name: "Pakistan", flag: "🇵🇰" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "AE", name: "UAE", flag: "🇦🇪" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
    { code: "MY", name: "Malaysia", flag: "🇲🇾" },
    { code: "SG", name: "Singapore", flag: "🇸🇬" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
  ];

  const handleCountrySelect = async (name: string) => {
    setSelectedCountry(name);
    setCountryOpen(false);
    if (user) {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase
        .from("profiles")
        .update({ country: name } as any)
        .eq("user_id", user.id);
      refetch();
    }
  };

  const currentCountryFlag = countries.find(c => c.name === selectedCountry)?.flag || "🌍";

  const displayName = profile?.username || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const copyUid = async () => {
    if (profile?.uid) {
      await navigator.clipboard.writeText(profile.uid);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "UID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative group focus:outline-none">
            <Avatar className="w-10 h-10 border-2 border-primary/50 hover:border-primary transition-colors cursor-pointer">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-sm">
                {loading ? "..." : initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-72 p-0 bg-card/95 backdrop-blur-xl border-primary/30"
          align="end"
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary/50">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-primary/20 text-primary font-orbitron">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-orbitron font-semibold text-foreground truncate flex items-center gap-1">
                  {displayName}
                  {profile?.is_verified && <VerifiedBadge />}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                title="Edit Profile"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider mb-1">
                  {t("profile.yourUid")}
                </p>
                <p className="font-orbitron font-bold text-lg text-primary tracking-widest">
                  {loading ? "Loading..." : (profile?.uid ?? "—")}
                </p>
              </div>
              <button
                onClick={copyUid}
                disabled={!profile?.uid}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                title="Copy UID"
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="p-2 space-y-0.5">
            <button
              onClick={() => setHistoryOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 text-foreground transition-colors text-sm font-rajdhani"
            >
              <History className="w-4 h-4 text-muted-foreground" />
              {t("profile.loginHistory")}
            </button>
            <button
              onClick={() => setLangOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 text-foreground transition-colors text-sm font-rajdhani"
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
              {t("profile.language")}: {languageNames[language]}
            </button>
            <button
              onClick={() => setCountryOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 text-foreground transition-colors text-sm font-rajdhani"
            >
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {t("profile.country")}: {currentCountryFlag} {selectedCountry}
            </button>
            <button
              onClick={() => setUserDarkMode(!isDark)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 text-foreground transition-colors text-sm font-rajdhani"
            >
              {isDark ? <Sun className="w-4 h-4 text-neon-gold" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
              {isDark ? t("profile.lightMode") : t("profile.darkMode")}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ProfileEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onProfileUpdated={refetch}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-foreground">{t("profile.loginHistory")}</DialogTitle>
          </DialogHeader>
          <LoginHistorySection />
        </DialogContent>
      </Dialog>

      <Dialog open={langOpen} onOpenChange={setLangOpen}>
        <DialogContent className="sm:max-w-sm bg-card/95 backdrop-blur-xl border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-primary flex items-center gap-2">
              <Globe className="w-5 h-5" /> {t("profile.language")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); setLangOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left font-rajdhani text-sm ${
                  language === lang
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border hover:border-primary/30 text-foreground"
                }`}
              >
                <span>{languageNames[lang]}</span>
                {language === lang && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={countryOpen} onOpenChange={setCountryOpen}>
        <DialogContent className="sm:max-w-sm bg-card/95 backdrop-blur-xl border-primary/30 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-primary flex items-center gap-2">
              <MapPin className="w-5 h-5" /> {t("profile.selectCountry")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country.name)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left font-rajdhani text-sm ${
                  selectedCountry === country.name
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border hover:border-primary/30 text-foreground"
                }`}
              >
                <span>{country.flag} {country.name}</span>
                {selectedCountry === country.name && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}