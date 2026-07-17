import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for error
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const error = hashParams.get("error_description");
      
      if (error) {
        setStatus("error");
        setErrorMessage(error);
        return;
      }

      // If no session and no error, the link might be invalid
      if (!session) {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        
        if (!code) {
          // Check hash params for token
          const accessToken = hashParams.get("access_token");
          if (!accessToken) {
            setStatus("error");
            setErrorMessage("Invalid or expired reset link. Please request a new one.");
          }
        }
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("success");
      // Sign out and redirect to login after a delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 3000);
    }
    
    setIsLoading(false);
  };

  if (status === "success") {
    return (
      <AuthLayout 
        title="Password Updated!" 
        subtitle="Your password has been reset successfully"
      >
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          
          <p className="text-muted-foreground font-rajdhani">
            Redirecting you to login...
          </p>
          
          <CyberButton onClick={() => navigate("/login")} className="w-full">
            Go to Login
          </CyberButton>
        </div>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout 
        title="Reset Failed" 
        subtitle="Unable to reset your password"
      >
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive/30">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          
          <p className="text-muted-foreground font-rajdhani">
            {errorMessage}
          </p>
          
          <CyberButton onClick={() => navigate("/forgot-password")} className="w-full">
            Request New Link
          </CyberButton>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Set New Password" 
      subtitle="Enter your new password below"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <CyberButton
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Updating...
            </>
          ) : (
            "Reset Password"
          )}
        </CyberButton>
      </form>
    </AuthLayout>
  );
}
