import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, Lock, User, Loader2, Rocket, Phone, MapPin, Calendar, ShieldCheck,
  ArrowLeft, Globe, Moon, Sun, Shield, KeyRound, BadgeCheck, Headphones,
  Eye, EyeOff, ChevronDown, Zap, Trophy, Crown, Users, Send,
  Instagram, Youtube, Twitter, MessageCircle,
} from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/i18n/translations";
import registerHero from "@/assets/register-hero.jpg";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, { message: "Full name must be at least 2 characters" }).max(50, { message: "Full name must be less than 50 characters" }),
  username: z.string().trim().min(3, { message: "Username must be at least 3 characters" }).max(20, { message: "Username must be less than 20 characters" }),
  email: z.string().trim().email({ message: "Invalid email address" }),
  phone: z.string().trim().regex(/^\d{10}$/, { message: "Phone number must be exactly 10 digits" }),
  age: z.number().int().min(13, { message: "You must be at least 13 years old" }).max(100, { message: "Invalid age" }),
  city: z.string().trim().min(2, { message: "City must be at least 2 characters" }).max(50, { message: "City must be less than 50 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function getPasswordStrength(pw: string): { level: number; label: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak" };
  if (score <= 2) return { level: 2, label: "Fair" };
  if (score <= 3) return { level: 3, label: "Strong" };
  return { level: 4, label: "Very Strong" };
}

/* ================================================================
   Premium building blocks — scoped to this page only.
   ================================================================ */

function PremiumField({
  icon, type = "text", placeholder, value, onChange, required, min, max,
  suffix, inputMode, autoComplete,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: number;
  max?: number;
  suffix?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <div className="group relative">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-fuchsia-500/0 via-violet-500/0 to-sky-500/0 opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-40" />
      <div className="relative flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 backdrop-blur-xl transition-all duration-300 focus-within:border-fuchsia-400/50 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_1px_rgba(217,70,239,0.35),0_10px_40px_-10px_rgba(139,92,246,0.6)]">
        <span className="text-white/40 transition-colors group-focus-within:text-fuchsia-300">
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          max={max}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/40 outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix}
      </div>
    </div>
  );
}

function TrustBadge({
  icon, title, subtitle,
}: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/40 hover:bg-white/[0.05]">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 text-fuchsia-300 ring-1 ring-fuchsia-400/30">
        {icon}
      </div>
      <div className="text-[13px] font-semibold tracking-wide text-white">{title}</div>
      <div className="text-[10.5px] leading-tight text-white/50">{subtitle}</div>
    </div>
  );
}

function StatPill({
  icon, value, label,
}: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-1 items-center gap-3 px-2">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-sky-500/15 text-fuchsia-300 ring-1 ring-white/10">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-base font-bold leading-tight text-white">{value}</div>
        <div className="text-[11px] uppercase tracking-widest text-white/50">{label}</div>
      </div>
    </div>
  );
}

function LanguageSelector() {
  const { language, setLanguage, languageNames } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-xl transition-all hover:border-fuchsia-400/40 hover:text-white">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{languageNames[language]}</span>
          <span className="sm:hidden uppercase">{language}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="border-white/10 bg-black/80 backdrop-blur-xl">
        {(Object.keys(languageNames) as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className="cursor-pointer text-white/80 focus:bg-fuchsia-500/15 focus:text-white"
          >
            {languageNames[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DarkModeToggle() {
  const { isDark, setUserDarkMode } = useTheme();
  return (
    <button
      onClick={() => setUserDarkMode(!isDark)}
      aria-label="Toggle dark mode"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5 backdrop-blur-xl transition-all hover:border-fuchsia-400/40"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full text-fuchsia-300">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
      <span className="hidden pr-1 text-sm font-medium text-white/80 sm:inline">
        {isDark ? "Dark" : "Light"}
      </span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${isDark ? "bg-gradient-to-r from-fuchsia-500 to-violet-500" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

function BrandLogo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 blur-lg opacity-60" />
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-600 to-sky-500 text-xl font-black text-white shadow-[0_10px_30px_-10px_rgba(217,70,239,0.7)]">
          E
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <div className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          IDEX<span className="bg-gradient-to-r from-fuchsia-400 to-sky-400 bg-clip-text text-transparent">OPN</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-transparent to-fuchsia-400/60" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
            Premium Esports
          </span>
          <span className="h-px w-4 bg-gradient-to-l from-transparent to-sky-400/60" />
        </div>
      </div>
    </div>
  );
}

function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(139,92,246,0.28),transparent_60%),radial-gradient(900px_500px_at_100%_20%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(700px_500px_at_50%_120%,rgba(217,70,239,0.22),transparent_60%)]" />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Orbs */}
      <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />
      <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl animate-[pulse_11s_ease-in-out_infinite]" />
      {/* Particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute block h-1 w-1 rounded-full bg-white/60 shadow-[0_0_10px_2px_rgba(217,70,239,0.6)]"
          style={{
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            animation: `floatParticle ${8 + (i % 6)}s ease-in-out ${i * 0.4}s infinite`,
            opacity: 0.35 + ((i % 5) * 0.1),
          }}
        />
      ))}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // OTP verification state
  const [showOTP, setShowOTP] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [resendCooldown]);

  const sendOTP = async (targetEmail: string) => {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { email: targetEmail },
    });
    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || "Failed to send verification code");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast({
        title: "Please accept the terms",
        description: "You must agree to the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    const validation = signupSchema.safeParse({
      fullName, username, email, phone,
      age: age ? parseInt(age) : 0,
      city, password, confirmPassword,
    });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await sendOTP(email.trim());
      setShowOTP(true);
      setResendCooldown(60);
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) return;
    setOtpLoading(true);

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-otp", {
        body: { email: email.trim(), otp: otpValue },
      });

      if (verifyError || !verifyData?.success) {
        toast({
          title: "Invalid Code",
          description: verifyData?.error || "The code you entered is incorrect.",
          variant: "destructive",
        });
        setOtpLoading(false);
        return;
      }

      const { error: signUpError } = await signUp(email, password, username);

      if (signUpError) {
        toast({
          title: "Signup Failed",
          description: signUpError.message,
          variant: "destructive",
        });
        setOtpLoading(false);
        return;
      }

      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        toast({
          title: "Account created!",
          description: "Please log in with your credentials.",
        });
        navigate("/login");
        setOtpLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({
              full_name: fullName.trim(),
              phone: phone.trim(),
              age: parseInt(age),
              city: city.trim(),
            })
            .eq("user_id", user.id);
        }
      } catch (err) {
        console.error("Failed to update profile details:", err);
      }

      toast({
        title: "Welcome!",
        description: "Your account has been verified and created successfully.",
      });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendOTP(email.trim());
      setResendCooldown(60);
      setOtpValue("");
      toast({
        title: "Code Resent",
        description: `A new code has been sent to ${email}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resend code",
        variant: "destructive",
      });
    }
  };

  const strength = getPasswordStrength(password);

  /* ---------- OTP screen ---------- */
  if (showOTP) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <BackgroundFX />
        <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
          <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl shadow-[0_30px_100px_-20px_rgba(139,92,246,0.5)]">
            <button
              onClick={() => { setShowOTP(false); setOtpValue(""); }}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to signup
            </button>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 ring-1 ring-fuchsia-400/40">
                <ShieldCheck className="h-7 w-7 text-fuchsia-300" />
              </div>
              <h1 className="text-2xl font-bold">Verify Your Email</h1>
              <p className="mt-1 text-sm text-white/60">Enter the 6-digit code sent to</p>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm font-medium text-fuchsia-300">
                <Mail className="h-4 w-4" />
                {email}
              </p>
            </div>
            <div className="mb-6 flex justify-center">
              <InputOTP
                value={otpValue}
                onChange={(val) => {
                  setOtpValue(val);
                  if (val.length === 6 && !otpLoading) {
                    setTimeout(() => {
                      document.getElementById("signup-otp-verify-btn")?.click();
                    }, 150);
                  }
                }}
                maxLength={6}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-11 rounded-xl border-white/15 bg-white/[0.05] text-lg text-white backdrop-blur"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button
              id="signup-otp-verify-btn"
              onClick={handleVerifyOTP}
              disabled={otpLoading || otpValue.length !== 6}
              className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-600 to-sky-500 font-semibold text-white shadow-[0_15px_40px_-10px_rgba(139,92,246,0.7)] transition-all hover:shadow-[0_20px_50px_-10px_rgba(217,70,239,0.9)] disabled:opacity-50"
            >
              {otpLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Verify &amp; Create Account
                </>
              )}
            </button>
            <div className="mt-5 text-center text-sm">
              {resendCooldown > 0 ? (
                <p className="text-white/60">
                  Resend code in <span className="font-semibold text-fuchsia-300">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendOTP}
                  className="font-semibold text-sky-300 transition-colors hover:text-sky-200"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Register screen ---------- */
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      <BackgroundFX />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <LanguageSelector />
          <div className="hidden md:block">
            <BrandLogo />
          </div>
          <DarkModeToggle />
        </header>

        {/* Mobile centered logo */}
        <div className="mt-6 flex justify-center md:hidden">
          <BrandLogo />
        </div>

        {/* Main grid */}
        <main className="mt-8 grid flex-1 grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* ---------- LEFT: HERO ---------- */}
          <section className="relative order-2 flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl lg:order-1 lg:p-8">
            <div className="absolute inset-0 -z-10">
              <img
                src={registerHero}
                alt="Luxury esports arena"
                width={1024}
                height={1536}
                className="h-full w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/90" />
            </div>

            <div className="max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-fuchsia-200 backdrop-blur">
                <Crown className="h-3.5 w-3.5" />
                Join the Arena
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                CREATE YOUR
                <br />
                <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
                  ACCOUNT!
                </span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70 sm:text-base">
                Join thousands of players and start your esports journey today.
                Compete in premium tournaments, win real rewards.
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {/* Security cards */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl sm:grid-cols-4">
                <TrustBadge icon={<Shield className="h-4 w-4" />} title="Secure" subtitle="Bank-level Security" />
                <TrustBadge icon={<KeyRound className="h-4 w-4" />} title="Encrypted" subtitle="256-bit SSL" />
                <TrustBadge icon={<BadgeCheck className="h-4 w-4" />} title="Verified" subtitle="Trusted by Millions" />
                <TrustBadge icon={<Headphones className="h-4 w-4" />} title="Support" subtitle="24/7 Customer" />
              </div>

              {/* Trusted by */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-black bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[10px] font-bold text-white"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Trusted by
                  </div>
                  <div className="text-sm font-bold">1 Million+ Gamers</div>
                </div>
                <div className="rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-3 py-1 text-xs font-black text-white shadow-lg">
                  1M+
                </div>
              </div>
            </div>
          </section>

          {/* ---------- RIGHT: FORM ---------- */}
          <section className="order-1 lg:order-2">
            <div className="relative">
              {/* Neon frame */}
              <div className="pointer-events-none absolute -inset-px rounded-[30px] bg-gradient-to-br from-fuchsia-500/50 via-violet-500/20 to-sky-500/50 opacity-70 blur-[2px]" />
              <div className="relative rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur-2xl shadow-[0_30px_120px_-20px_rgba(139,92,246,0.55)] sm:p-8">
                {/* Card header */}
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 ring-1 ring-fuchsia-400/40">
                    <Crown className="h-7 w-7 text-fuchsia-300" />
                  </div>
                  <h2 className="mt-4 bg-gradient-to-r from-fuchsia-400 via-violet-400 to-sky-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                    Join the Arena
                  </h2>
                  <p className="mt-1 text-sm text-white/60">
                    Create your account and start competing
                  </p>
                  <div className="mx-auto mt-3 flex items-center justify-center gap-2">
                    <span className="h-px w-8 bg-gradient-to-r from-transparent to-fuchsia-400/60" />
                    <span className="h-1 w-1 rounded-full bg-fuchsia-400" />
                    <span className="h-1 w-1 rounded-full bg-violet-400" />
                    <span className="h-1 w-1 rounded-full bg-sky-400" />
                    <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-400/60" />
                  </div>
                </div>

                {/* Google */}
                <div className="mt-6">
                  <GoogleSignInButton />
                </div>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] uppercase tracking-widest text-white/40">
                    or continue with
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <PremiumField
                    icon={<User className="h-4.5 w-4.5" />}
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                  <PremiumField
                    icon={<User className="h-4.5 w-4.5" />}
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                  <PremiumField
                    icon={<Mail className="h-4.5 w-4.5" />}
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  <PremiumField
                    icon={<Phone className="h-4.5 w-4.5" />}
                    type="tel"
                    placeholder="Phone Number (10 digits)"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(value);
                    }}
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <PremiumField
                      icon={<Calendar className="h-4.5 w-4.5" />}
                      type="number"
                      placeholder="Age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min={13}
                      max={100}
                      required
                    />
                    <PremiumField
                      icon={<MapPin className="h-4.5 w-4.5" />}
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                  <PremiumField
                    icon={<Lock className="h-4.5 w-4.5" />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-white/40 hover:text-white"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  {password.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/50">Password strength:</span>
                        <span className={
                          strength.level <= 1 ? "font-semibold text-rose-400" :
                          strength.level <= 2 ? "font-semibold text-amber-400" :
                          strength.level <= 3 ? "font-semibold text-sky-400" :
                          "font-semibold text-emerald-400"
                        }>{strength.label}</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              level <= strength.level
                                ? strength.level <= 1
                                  ? "bg-rose-500"
                                  : strength.level <= 2
                                  ? "bg-amber-500"
                                  : strength.level <= 3
                                  ? "bg-gradient-to-r from-fuchsia-500 to-sky-500"
                                  : "bg-gradient-to-r from-emerald-400 to-sky-400"
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <PremiumField
                    icon={<Lock className="h-4.5 w-4.5" />}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="text-white/40 hover:text-white"
                        aria-label="Toggle password visibility"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {/* Terms */}
                  <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm text-white/70">
                    <span className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="grid h-4 w-4 place-items-center rounded-md border border-white/20 bg-white/[0.04] transition-all peer-checked:border-fuchsia-400 peer-checked:bg-gradient-to-br peer-checked:from-fuchsia-500 peer-checked:to-violet-600">
                        <svg
                          viewBox="0 0 12 12"
                          className={`h-2.5 w-2.5 text-white transition-opacity ${agreedToTerms ? "opacity-100" : "opacity-0"}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 6.5L5 9.5L10 3.5" />
                        </svg>
                      </span>
                    </span>
                    <span className="leading-snug">
                      I agree to the{" "}
                      <Link to="/terms" className="font-medium text-fuchsia-300 hover:text-fuchsia-200">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="font-medium text-sky-300 hover:text-sky-200">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-600 to-sky-500 font-semibold tracking-wide text-white shadow-[0_15px_40px_-10px_rgba(139,92,246,0.7)] transition-all hover:shadow-[0_20px_50px_-10px_rgba(217,70,239,0.9)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending verification...
                      </>
                    ) : (
                      <>
                        CREATE ACCOUNT
                        <Rocket className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-white/60">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-sky-300 transition-colors hover:text-sky-200"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Stats bar */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
            <StatPill icon={<Shield className="h-5 w-5" />} value="99.9%" label="Uptime" />
            <StatPill icon={<Zap className="h-5 w-5" />} value="24/7" label="Support" />
            <StatPill icon={<Trophy className="h-5 w-5" />} value="Top Rated" label="Platform" />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-col items-center gap-4 pb-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Follow us
          </div>
          <div className="flex items-center gap-3">
            {[
              { href: "https://discord.com", label: "Discord", icon: <MessageCircle className="h-4 w-4" />, color: "hover:text-indigo-300 hover:border-indigo-400/50" },
              { href: "https://instagram.com", label: "Instagram", icon: <Instagram className="h-4 w-4" />, color: "hover:text-pink-300 hover:border-pink-400/50" },
              { href: "https://twitter.com", label: "Twitter", icon: <Twitter className="h-4 w-4" />, color: "hover:text-sky-300 hover:border-sky-400/50" },
              { href: "https://youtube.com", label: "YouTube", icon: <Youtube className="h-4 w-4" />, color: "hover:text-red-300 hover:border-red-400/50" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className={`grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 backdrop-blur-xl transition-all ${s.color}`}
              >
                {s.icon}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} IDEXOPN. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}