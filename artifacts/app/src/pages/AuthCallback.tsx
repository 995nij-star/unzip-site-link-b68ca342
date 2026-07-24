import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Gamepad2 } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";

/**
 * Wait for a session to become available after an OAuth / magic-link redirect.
 *
 * With the PKCE flow the `?code=` in the URL is exchanged for a session
 * asynchronously by the Supabase client (`detectSessionInUrl`). Calling
 * `getSession()` immediately can therefore return `null` even though sign-in
 * will succeed a moment later. We listen to `onAuthStateChange` (which fires
 * on `SIGNED_IN`) and also poll `getSession()`, resolving as soon as either
 * produces a session, with an overall timeout as a safety net.
 */
function waitForSession(timeoutMs = 10000): Promise<Session | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (session: Session | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve(session);
    };

    // 1. React to the auth state change (fires when the code exchange completes).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    // 2. In case the session already exists (or the exchange finished before we
    //    subscribed), check immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });

    // 3. Safety-net timeout: resolve with whatever session currently exists.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      finish(data.session ?? null);
    }, timeoutMs);
  });
}

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const resolveNextPath = () => {
      let nextPath: string | null = null;
      try {
        const v = sessionStorage.getItem("post-login-next");
        if (v && v.startsWith("/") && !v.startsWith("//")) nextPath = v;
        sessionStorage.removeItem("post-login-next");
      } catch {}
      return nextPath;
    };

    const handleCallback = async () => {
      try {
        // First, check for an explicit error in the URL (both hash and query).
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const queryParams = new URLSearchParams(window.location.search);

        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");
        const errorMessage = hashParams.get("error") || queryParams.get("error");

        if (errorDescription || errorMessage) {
          throw new Error(decodeURIComponent(errorDescription || errorMessage || "Authentication failed"));
        }

        const hasAuthPayload =
          queryParams.has("code") ||
          hashParams.has("access_token") ||
          hashParams.has("refresh_token");

        // Wait for Supabase to establish the session from the URL. This resolves
        // as soon as onAuthStateChange fires (or getSession returns a session),
        // rather than assuming the exchange has already completed.
        const session = await waitForSession();

        if (session) {
          // Check if the user is banned before letting them through.
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_banned")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (profile?.is_banned) {
            const { data: banLog } = await supabase
              .from("ban_audit_log")
              .select("reason")
              .eq("user_id", session.user.id)
              .eq("action", "ban")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            await supabase.auth.signOut();
            setStatus("error");
            const reason = banLog?.reason ? `\n\nReason: ${banLog.reason}` : "";
            setMessage(`Your account has been blocked.${reason}\n\nContact support for assistance.`);
            return;
          }

          // Authenticated: send the user to their destination (never back to /login).
          const nextPath = resolveNextPath();
          setStatus("success");
          setMessage("Login successful!");
          setTimeout(() => {
            navigate(nextPath ?? "/dashboard", { replace: true });
          }, 1200);
          return;
        }

        // No session established.
        if (hasAuthPayload) {
          // We had auth params but never got a session — treat as an error so the
          // user isn't silently bounced to /login.
          throw new Error("We couldn't complete your sign-in. Please try again.");
        }

        // No auth payload at all (e.g. a bare email-verification link).
        setStatus("success");
        setMessage("Verification complete! Please log in.");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
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
