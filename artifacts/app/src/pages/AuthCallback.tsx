import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Gamepad2 } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First, check for error in URL params (both hash and query)
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");
        const errorMessage = hashParams.get("error") || queryParams.get("error");
        
        if (errorDescription || errorMessage) {
          throw new Error(decodeURIComponent(errorDescription || errorMessage || "Authentication failed"));
        }

        // For OAuth flows, Supabase handles the code exchange automatically
        // We just need to wait for the session to be established
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data.session) {
          // Check if user is banned
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_banned')
            .eq('user_id', data.session.user.id)
            .single();

          if (profile?.is_banned) {
            // Fetch the ban reason from audit log
            const { data: banLog } = await supabase
              .from('ban_audit_log')
              .select('reason')
              .eq('user_id', data.session.user.id)
              .eq('action', 'ban')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            await supabase.auth.signOut();
            setStatus("error");
            const reason = banLog?.reason ? `\n\nReason: ${banLog.reason}` : '';
            setMessage(`Your account has been blocked.${reason}\n\nContact support for assistance.`);
            return;
          }

          setStatus("success");
          setMessage("Login successful!");

          let nextPath: string | null = null;
          try {
            const v = sessionStorage.getItem("post-login-next");
            if (v && v.startsWith("/") && !v.startsWith("//")) nextPath = v;
            sessionStorage.removeItem("post-login-next");
          } catch {}
          setTimeout(() => {
            navigate(nextPath ?? "/dashboard");
          }, 1500);
        } else {
          // No session yet - might still be processing
          // Wait a moment and try again
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryData, error: retryError } = await supabase.auth.getSession();
          
          if (retryError) {
            throw retryError;
          }
          
          if (retryData.session) {
            setStatus("success");
            setMessage("Login successful!");
            let nextPath: string | null = null;
            try {
              const v = sessionStorage.getItem("post-login-next");
              if (v && v.startsWith("/") && !v.startsWith("//")) nextPath = v;
              sessionStorage.removeItem("post-login-next");
            } catch {}
            setTimeout(() => {
              navigate(nextPath ?? "/dashboard");
            }, 1500);
          } else {
            setStatus("success");
            setMessage("Verification complete! Please log in.");
            setTimeout(() => {
              navigate("/login");
            }, 2000);
          }
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage(error.message || "Verification failed. Please try again.");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background cyber-grid relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Gamepad2 className="w-12 h-12 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
            </div>
            <h1 className="text-4xl font-orbitron font-bold text-gradient-neon">
              Idexopn
            </h1>
          </div>
        </div>

        {/* Status Card */}
        <div className="relative bg-gradient-card rounded-2xl border-2 border-border shadow-card overflow-hidden p-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="text-center space-y-6">
            {status === "loading" && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-orbitron font-bold text-foreground mb-2">
                    Verifying...
                  </h2>
                  <p className="text-muted-foreground font-rajdhani">
                    Please wait while we verify your email
                  </p>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-orbitron font-bold text-foreground mb-2">
                    Verified!
                  </h2>
                  <p className="text-muted-foreground font-rajdhani">
                    {message}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground font-rajdhani">
                  Redirecting you automatically...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive/30">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                <div>
                  <h2 className="text-2xl font-orbitron font-bold text-foreground mb-2">
                    Verification Failed
                  </h2>
                  <p className="text-muted-foreground font-rajdhani">
                    {message}
                  </p>
                </div>
                <CyberButton onClick={() => navigate("/signup")} className="w-full">
                  Try Again
                </CyberButton>
              </>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
