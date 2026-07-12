import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmailSent(true);
      startCooldown();
    }
    
    setIsLoading(false);
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email sent!",
        description: "Check your inbox for the reset link",
      });
      startCooldown();
    }

    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <AuthLayout 
        title="Check Your Email" 
        subtitle="We've sent a password reset link"
      >
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <p className="text-foreground font-rajdhani text-lg">
              Reset link sent to
            </p>
            <p className="text-primary font-orbitron font-bold">
              {email}
            </p>
          </div>
          
          <p className="text-muted-foreground font-rajdhani text-sm">
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>
          
          <div className="pt-4 border-t border-border space-y-3">
            <CyberButton
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Resend Reset Email
                </>
              )}
            </CyberButton>
            
            <p className="text-muted-foreground font-rajdhani text-sm">
              Wrong email?{" "}
              <button 
                onClick={() => setEmailSent(false)}
                className="text-primary hover:text-neon-cyan transition-colors font-semibold"
              >
                Go back
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-primary hover:text-neon-cyan transition-colors font-semibold font-rajdhani"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Enter your email to receive a reset link"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <CyberInput
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-5 h-5" />}
          required
        />

        <CyberButton
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </CyberButton>
      </form>

      <div className="mt-6 text-center">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-primary hover:text-neon-cyan transition-colors font-semibold font-rajdhani"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}
