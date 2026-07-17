import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowLeft, CheckCircle, RefreshCw, KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Invalid email address" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((p) => {
        if (p <= 1) { clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const sendOtp = async (isResend = false) => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: "Invalid email", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("send-password-reset-otp", {
      body: { email: parsed.data },
    });
    setIsLoading(false);
    if (error || !data?.success) {
      toast({
        title: "Failed to send code",
        description: (data?.error as string) || error?.message || "Try again shortly",
        variant: "destructive",
      });
      return;
    }
    toast({ title: isResend ? "Code resent" : "Code sent", description: `Check ${email} for a 6-digit code` });
    setStep("otp");
    startCooldown();
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("verify-password-reset-otp", {
      body: { email: email.trim().toLowerCase(), otp },
    });
    setIsLoading(false);
    if (error || !data?.success) {
      toast({
        title: "Invalid code",
        description: (data?.error as string) || error?.message || "Please try again",
        variant: "destructive",
      });
      return;
    }
    setStep("password");
  };

  const resetPassword = async () => {
    const p = passwordSchema.safeParse(password);
    if (!p.success) {
      toast({ title: "Weak password", description: p.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("verify-password-reset-otp", {
      body: { email: email.trim().toLowerCase(), otp, newPassword: password },
    });
    setIsLoading(false);
    if (error || !data?.success) {
      toast({
        title: "Reset failed",
        description: (data?.error as string) || error?.message || "Try again",
        variant: "destructive",
      });
      return;
    }
    setStep("done");
    setTimeout(() => navigate("/login"), 2500);
  };

  return (
    <AuthLayout
      title={
        step === "email" ? "Reset Password" :
        step === "otp" ? "Enter Code" :
        step === "password" ? "New Password" :
        "Password Updated"
      }
      subtitle={
        step === "email" ? "We'll send a 6-digit code to your email" :
        step === "otp" ? `Code sent to ${email}` :
        step === "password" ? "Choose a strong new password" :
        "You can now log in with your new password"
      }
    >
      {step === "email" && (
        <form onSubmit={(e) => { e.preventDefault(); sendOtp(false); }} className="space-y-5">
          <CyberInput
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5" />}
            required
          />
          <CyberButton type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Sending...</>) : "Send Code"}
          </CyberButton>
        </form>
      )}

      {step === "otp" && (
        <div className="space-y-5">
          <div className="flex justify-center">
            <InputOTP value={otp} onChange={setOtp} maxLength={6}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <CyberButton onClick={verifyOtp} className="w-full" size="lg" disabled={isLoading || otp.length !== 6}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Verifying...</>) : (<><KeyRound className="w-5 h-5" />Verify Code</>)}
          </CyberButton>
          <CyberButton
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => sendOtp(true)}
            disabled={isLoading || resendCooldown > 0}
          >
            <RefreshCw className="w-4 h-4" />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
          </CyberButton>
          <button
            type="button"
            onClick={() => { setStep("email"); setOtp(""); }}
            className="w-full text-sm text-muted-foreground hover:text-primary transition-colors font-rajdhani"
          >
            Wrong email? Go back
          </button>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }} className="space-y-5">
          <CyberInput
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-5 h-5" />}
            required
          />
          <CyberInput
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock className="w-5 h-5" />}
            required
          />
          <CyberButton type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Updating...</>) : "Reset Password"}
          </CyberButton>
        </form>
      )}

      {step === "done" && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <p className="text-muted-foreground font-rajdhani">Redirecting to login...</p>
          <CyberButton onClick={() => navigate("/login")} className="w-full">Go to Login</CyberButton>
        </div>
      )}

      {step !== "done" && (
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-neon-cyan transition-colors font-semibold font-rajdhani"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
