import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Globe,
  Moon,
  Sun,
  ArrowRight,
  ShieldCheck as ShieldIcon,
  Lock as LockIcon,
  BadgeCheck,
  Headphones,
  Zap,
  Trophy,
  Crown,
} from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SecuritySettings } from "@/hooks/useSecuritySettings";
import { timed } from "@/lib/perfTiming";
import { useLoginPageSettings } from "@/hooks/useLoginPageSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Language } from "@/i18n/translations";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loginBlocked, setLoginBlocked] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const [loadingStage, setLoadingStage] = useState<string>("");

  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  // Same-origin relative path only.
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  // Remember across Google OAuth round-trip.
  useEffect(() => {
    if (nextPath) {
      try { sessionStorage.setItem("post-login-next", nextPath); } catch {}
    }
  }, [nextPath]);
  const { settings: s } = useLoginPageSettings();
  const { isDark, setUserDarkMode } = useTheme();
  const { language, setLanguage, languageNames } = useLanguage();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendOtp = async () => {
    const { data, error } = await timed("send-otp", () =>
      supabase.functions.invoke("send-otp", {
        body: { email: email.trim().toLowerCase() },
      })
    ) as any;
    if (error || !data?.success) {
      throw new Error(data?.error || "Failed to send OTP");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLoadingStage("Authenticating…");

    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
      setLoadingStage("");
      return;
    }

    toast({ title: "Welcome back!", description: "Login successful" });
    try { sessionStorage.removeItem("post-login-next"); } catch {}
    navigate(nextPath ?? "/admin");
    setIsLoading(false);
    setLoadingStage("");
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setIsVerifying(true);
    setLoadingStage("Verifying code…");
    try {
      const { data, error } = await timed("verify-otp", () =>
        supabase.functions.invoke("verify-otp", {
          body: { email: email.trim().toLowerCase(), otp: otpCode },
        })
      ) as any;
      if (error || !data?.success) {
        toast({
          title: "Verification Failed",
          description: data?.error || "Invalid or expired code",
          variant: "destructive",
        });
        setIsVerifying(false);
        setLoadingStage("");
        return;
      }
      if (data.actionLink) {
        const url = new URL(data.actionLink);
        const token_hash = url.searchParams.get("token") || url.hash?.split("token=")[1];
        if (token_hash) {
          await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
        }
      }
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast({ title: "Login Failed", description: signInError.message, variant: "destructive" });
        setIsVerifying(false);
        setLoadingStage("");
        return;
      }
      toast({ title: "Welcome back!", description: "Login successful" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    }
    setIsVerifying(false);
    setLoadingStage("");
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendOtp();
      setResendCooldown(60);
      toast({ title: "Code Resent", description: "A new 6-digit code has been sent to your email" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Dynamic style vars driven by admin settings
  const styleVars: React.CSSProperties = {
    // @ts-ignore CSS vars
    "--lp-primary": s.primaryColor,
    "--lp-accent": s.accentColor,
    "--lp-btn-from": s.buttonGradientFrom,
    "--lp-btn-to": s.buttonGradientTo,
    "--lp-glass-alpha": String(s.glassOpacity),
    "--lp-glass-blur": `${s.glassBlur}px`,
    "--lp-border-glow": String(s.borderGlow),
  };

  // ────────────────────────────────────────────────────────────
  // 2FA OTP step
  // ────────────────────────────────────────────────────────────
  if (twoFAStep) {
    return (
      <div
        style={styleVars}
        className="min-h-screen w-full flex items-center justify-center bg-black text-white p-4 relative overflow-hidden"
      >
        <PremiumBackground bgImage={s.backgroundImageUrl} />
        <div className="relative z-10 w-full max-w-md">
          <GlassCard>
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, hsl(var(--lp-primary)/0.35), hsl(var(--lp-accent)/0.15))`,
                  border: `1px solid hsl(var(--lp-primary)/0.5)`,
                  boxShadow: `0 0 30px hsl(var(--lp-primary)/0.5)`,
                }}
              >
                <ShieldCheck className="w-8 h-8" style={{ color: `hsl(var(--lp-primary))` }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-orbitron">Two-Factor Authentication</h2>
                <p className="text-sm text-white/60 mt-1">Enter the 6-digit code sent to</p>
                <p className="text-sm font-mono tracking-wider mt-1" style={{ color: `hsl(var(--lp-primary))` }}>{email}</p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val);
                    if (val.length === 6 && !isVerifying) {
                      setTimeout(() => document.getElementById("login-otp-verify-btn")?.click(), 150);
                    }
                  }}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <PrimaryButton
                id="login-otp-verify-btn"
                onClick={handleVerifyOtp}
                disabled={isVerifying || otpCode.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {loadingStage || "Verifying..."}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Verify & Login
                  </>
                )}
              </PrimaryButton>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setTwoFAStep(false); setOtpCode(""); }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  ← Back to login
                </button>
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="disabled:opacity-50"
                  style={{ color: `hsl(var(--lp-primary))` }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // MAIN LOGIN
  // ────────────────────────────────────────────────────────────
  return (
    <div
      style={styleVars}
      className="min-h-screen w-full bg-black text-white relative overflow-x-hidden"
    >
      <PremiumBackground bgImage={s.backgroundImageUrl} />

      {/* Top bar: Language + Dark Mode */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-8 lg:px-12 pt-5 sm:pt-6">
        {s.showLanguageSelector ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl transition-all">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{languageNames[language]}</span>
                <span className="sm:hidden uppercase">{language}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-black/95 border-white/10 backdrop-blur-2xl">
              {(Object.keys(languageNames) as Language[]).map((code) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setLanguage(code)}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/10"
                >
                  {languageNames[code]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : <div />}

        {s.showDarkModeToggle && (
          <button
            onClick={() => setUserDarkMode(!isDark)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl transition-all"
          >
            {isDark ? <Moon className="w-4 h-4" style={{ color: `hsl(var(--lp-primary))` }} /> : <Sun className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? "Dark Mode" : "Light Mode"}</span>
            <span
              className={`ml-1 relative w-9 h-5 rounded-full transition-colors ${isDark ? "" : "bg-white/20"}`}
              style={isDark ? { background: `linear-gradient(90deg, hsl(var(--lp-btn-from)), hsl(var(--lp-btn-to)))` } : undefined}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : ""}`}
              />
            </span>
          </button>
        )}
      </div>

      {/* Center Logo */}
      <div className="relative z-10 flex justify-center pt-6 pb-2 sm:pt-8">
        <BrandLogo logoUrl={s.logoUrl} />
      </div>

      {/* Main split layout */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center">
        {/* LEFT: Hero */}
        <div className="hidden lg:flex flex-col gap-8 pr-4">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] border border-white/10"
            style={{
              boxShadow: `0 40px 80px -20px hsl(var(--lp-primary)/0.35)`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: s.backgroundImageUrl
                  ? `url(${s.backgroundImageUrl}) center/cover no-repeat`
                  : `radial-gradient(circle at 30% 30%, hsl(var(--lp-primary)/0.55), transparent 60%), radial-gradient(circle at 80% 70%, hsl(var(--lp-accent)/0.45), transparent 55%), linear-gradient(135deg, #14051f 0%, #05010f 100%)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-0 mix-blend-screen opacity-40"
              style={{
                background: `radial-gradient(circle at 20% 20%, hsl(var(--lp-primary)/0.25), transparent 40%)`
              }}
            />
          </div>
          <div>
            <div className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: `hsl(var(--lp-primary))` }}>
              {s.heroKicker}
            </div>
            <h2 className="text-5xl xl:text-6xl font-black font-orbitron leading-[1.05] tracking-tight">
              {renderHeroTitle(s.heroTitle)}
            </h2>
            <p className="mt-5 text-white/60 text-base leading-relaxed max-w-md">
              {s.heroSubtitle}
            </p>
          </div>
          <TrustFeatureRow />
        </div>

        {/* RIGHT: Glass card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <GlassCard>
            {/* Crown badge */}
            <div className="flex justify-center -mt-2 mb-3">
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--lp-btn-from)/0.25), hsl(var(--lp-btn-to)/0.15))`,
                  border: `1px solid hsl(var(--lp-primary)/0.5)`,
                  boxShadow: `0 0 40px hsl(var(--lp-primary)/0.4)`,
                }}
              >
                <Crown className="w-8 h-8" style={{ color: `hsl(var(--lp-primary))` }} />
              </div>
            </div>

            <div className="text-center mb-5">
              <h1 className="text-3xl sm:text-4xl font-black font-orbitron tracking-tight">
                {renderTitleWithAccent(s.welcomeTitle)}
              </h1>
              <p className="mt-2 text-white/60 text-sm">{s.welcomeSubtitle}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="w-8 h-px" style={{ background: `linear-gradient(90deg, transparent, hsl(var(--lp-primary)/0.6))` }} />
                <span className="w-1 h-1 rounded-full" style={{ background: `hsl(var(--lp-primary))` }} />
                <span className="w-1.5 h-1.5 rotate-45" style={{ background: `hsl(var(--lp-accent))` }} />
                <span className="w-1 h-1 rounded-full" style={{ background: `hsl(var(--lp-primary))` }} />
                <span className="w-8 h-px" style={{ background: `linear-gradient(90deg, hsl(var(--lp-primary)/0.6), transparent)` }} />
              </div>
            </div>

            {loginBlocked && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm text-center">
                🔒 {lockoutMessage || "Account temporarily locked."}
              </div>
            )}

            {s.showGoogleLogin && (
              <div className="[&_button]:!bg-white [&_button]:!text-black [&_button]:!border-white/20 [&_button]:hover:!bg-white/90 [&_button]:!h-12 [&_button]:!rounded-xl [&_button]:!font-semibold">
                <GoogleSignInButton />
              </div>
            )}

            {s.showGoogleLogin && s.showEmailLogin && (
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs tracking-[0.25em] text-white/40 font-semibold">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            {s.showEmailLogin && (
              <form onSubmit={handleLogin} className="space-y-4">
                <PremiumInput
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
                <PremiumInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-white/50 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                {(s.showRememberMe || s.showForgotPassword) && (
                  <div className="flex items-center justify-between text-sm pt-1">
                    {s.showRememberMe ? (
                      <label className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white transition-colors">
                        <Checkbox
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                          className="border-white/30 data-[state=checked]:text-white"
                          style={{
                            // @ts-ignore
                            "--tw-ring-color": `hsl(var(--lp-primary))`,
                          }}
                        />
                        <span>Remember me</span>
                      </label>
                    ) : <span />}
                    {s.showForgotPassword && (
                      <Link
                        to="/forgot-password"
                        className="font-semibold hover:underline"
                        style={{ color: `hsl(var(--lp-primary))` }}
                      >
                        Forgot Password?
                      </Link>
                    )}
                  </div>
                )}

                <PrimaryButton type="submit" disabled={isLoading || loginBlocked}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loadingStage || "Logging in..."}
                    </>
                  ) : (
                    <>
                      Login
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </PrimaryButton>
              </form>
            )}

            {s.showRegister && (
              <p className="mt-6 text-center text-sm text-white/60">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-bold hover:underline"
                  style={{ color: `hsl(var(--lp-primary))` }}
                >
                  Register
                </Link>
              </p>
            )}
          </GlassCard>

          {/* Mobile trust row */}
          <div className="lg:hidden mt-6">
            <TrustFeatureRow compact />
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <StatsBar />

      {/* Footer */}
      <footer className="relative z-10 px-4 pb-6 pt-2 text-center text-xs text-white/40">
        <div className="flex items-center justify-center gap-1.5">
          <LockIcon className="w-3 h-3" />
          <span>{s.footerText}</span>
        </div>
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function renderTitleWithAccent(title: string) {
  const parts = title.split(" ");
  if (parts.length < 2) return title;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")}{" "}
      <span
        style={{
          background: `linear-gradient(135deg, hsl(var(--lp-btn-from)), hsl(var(--lp-btn-to)))`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {last}
      </span>
    </>
  );
}

function renderHeroTitle(title: string) {
  // Emphasize last word with gradient
  const parts = title.split(" ");
  if (parts.length < 2) return title;
  const last = parts.pop();
  return (
    <>
      {parts.join(" ")}{" "}
      <span
        style={{
          background: `linear-gradient(135deg, hsl(var(--lp-btn-from)), hsl(var(--lp-btn-to)))`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {last}
      </span>
    </>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-3xl p-[1.5px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(var(--lp-primary)/calc(var(--lp-border-glow) * 1)), hsl(var(--lp-accent)/calc(var(--lp-border-glow) * 0.7)), hsl(var(--lp-primary)/calc(var(--lp-border-glow) * 0.4)))`,
      }}
    >
      <div
        className="relative rounded-[calc(1.5rem-1.5px)] p-6 sm:p-8"
        style={{
          background: `linear-gradient(180deg, rgba(20, 10, 40, calc(var(--lp-glass-alpha) * 0.9)), rgba(5, 3, 20, calc(var(--lp-glass-alpha) * 0.95)))`,
          backdropFilter: `blur(var(--lp-glass-blur)) saturate(1.4)`,
          WebkitBackdropFilter: `blur(var(--lp-glass-blur)) saturate(1.4)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.04), 0 30px 80px -20px hsl(var(--lp-primary)/0.45)`,
        }}
      >
        {/* Corner accents */}
        <div className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-t border-l rounded-tl-md" style={{ borderColor: `hsl(var(--lp-primary)/0.5)` }} />
        <div className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-t border-r rounded-tr-md" style={{ borderColor: `hsl(var(--lp-primary)/0.5)` }} />
        <div className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b border-l rounded-bl-md" style={{ borderColor: `hsl(var(--lp-accent)/0.5)` }} />
        <div className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b border-r rounded-br-md" style={{ borderColor: `hsl(var(--lp-accent)/0.5)` }} />
        {children}
      </div>
    </div>
  );
}

function PremiumInput({
  leftIcon,
  rightSlot,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      className="group relative flex items-center gap-3 h-12 px-4 rounded-xl transition-all"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {leftIcon && (
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, hsl(var(--lp-primary)/0.2), hsl(var(--lp-accent)/0.15))`,
            color: `hsl(var(--lp-primary))`,
            border: `1px solid hsl(var(--lp-primary)/0.25)`,
          }}
        >
          {leftIcon}
        </span>
      )}
      <input
        {...props}
        className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40 font-medium"
      />
      {rightSlot}
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity"
        style={{
          boxShadow: `0 0 0 1px hsl(var(--lp-primary)/0.6), 0 0 24px hsl(var(--lp-primary)/0.3)`,
        }}
      />
    </div>
  );
}

function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`relative w-full h-12 rounded-xl font-bold font-orbitron text-white flex items-center justify-center gap-2 overflow-hidden group transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        background: `linear-gradient(90deg, hsl(var(--lp-btn-from)), hsl(var(--lp-btn-to)))`,
        boxShadow: `0 10px 30px -8px hsl(var(--lp-btn-from)/0.6), 0 0 0 1px rgba(255,255,255,0.08) inset`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, hsl(var(--lp-btn-to)), hsl(var(--lp-btn-from)))`,
        }}
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

function BrandLogo({ logoUrl }: { logoUrl: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
      ) : (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center rotate-6"
          style={{
            background: `linear-gradient(135deg, hsl(var(--lp-btn-from)), hsl(var(--lp-btn-to)))`,
            boxShadow: `0 0 30px hsl(var(--lp-primary)/0.6)`,
          }}
        >
          <span className="font-black font-orbitron text-white text-xl -rotate-6">E</span>
        </div>
      )}
      <div className="flex flex-col leading-none">
        <span className="text-2xl sm:text-3xl font-black font-orbitron tracking-wide">
          <span className="text-white">IDEX</span>
          <span
            style={{
              background: `linear-gradient(135deg, hsl(var(--lp-btn-from)), hsl(var(--lp-btn-to)))`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OPN
          </span>
        </span>
        <span className="mt-1 text-[10px] tracking-[0.35em] text-white/50 font-semibold">
          PREMIUM ESPORTS
        </span>
      </div>
    </div>
  );
}

function TrustFeatureRow({ compact = false }: { compact?: boolean }) {
  const items = [
    { icon: ShieldIcon, title: "SECURE", sub: "Bank-level Security" },
    { icon: LockIcon, title: "ENCRYPTED", sub: "256-bit SSL" },
    { icon: BadgeCheck, title: "VERIFIED", sub: "Trusted by Millions" },
    { icon: Headphones, title: "SUPPORT", sub: "24/7 Customer" },
  ];
  return (
    <div
      className={`grid grid-cols-4 gap-2 sm:gap-3 rounded-2xl p-3 sm:p-4 border border-white/10`}
      style={{
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(12px)",
      }}
    >
      {items.map((it) => (
        <div key={it.title} className="flex flex-col items-center text-center gap-1.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(var(--lp-primary)/0.18), hsl(var(--lp-accent)/0.12))`,
              border: `1px solid hsl(var(--lp-primary)/0.3)`,
              color: `hsl(var(--lp-primary))`,
            }}
          >
            <it.icon className="w-4 h-4" />
          </div>
          <div className={`text-[10px] font-bold tracking-wider ${compact ? "" : ""}`}>{it.title}</div>
          <div className="text-[9px] text-white/50 leading-tight">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function StatsBar() {
  return (
    <div className="relative z-10 mx-4 sm:mx-6 lg:mx-10 mb-6 rounded-2xl border border-white/10 px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4"
      style={{
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(14px)",
      }}
    >
      <StatItem icon={<Trophy className="w-4 h-4" />} label="1M+" sub="TRUSTED GAMERS" />
      <StatItem icon={<ShieldIcon className="w-4 h-4" />} label="99.9%" sub="Uptime" />
      <StatItem icon={<Zap className="w-4 h-4" />} label="24/7" sub="Support" />
      <StatItem icon={<Trophy className="w-4 h-4" />} label="Top Rated" sub="Platform" />
    </div>
  );
}

function StatItem({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, hsl(var(--lp-primary)/0.18), hsl(var(--lp-accent)/0.12))`,
          border: `1px solid hsl(var(--lp-primary)/0.3)`,
          color: `hsl(var(--lp-primary))`,
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-lg font-black font-orbitron leading-none">{label}</div>
        <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">{sub}</div>
      </div>
    </div>
  );
}

function PremiumBackground({ bgImage }: { bgImage: string | null }) {
  return (
    <>
      {/* Base black */}
      <div className="absolute inset-0 bg-black" />
      {/* Optional custom bg image */}
      {bgImage && (
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: `url(${bgImage}) center/cover no-repeat` }}
        />
      )}
      {/* Neon glow blobs */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, hsl(var(--lp-primary)/0.28), transparent 65%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, hsl(var(--lp-accent)/0.22), transparent 65%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, hsl(var(--lp-primary)/0.16), transparent 70%)`,
          filter: "blur(30px)",
        }}
      />
      {/* Cyber grid */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
      }} />
    </>
  );
}
