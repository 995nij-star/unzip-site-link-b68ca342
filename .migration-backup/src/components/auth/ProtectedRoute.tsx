import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Gamepad2, ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const [isBanned, setIsBanned] = useState<boolean | null>(null);
  const [checkingBan, setCheckingBan] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user) {
        setCheckingBan(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setIsBanned(data.is_banned ?? false);
      } else {
        setIsBanned(false);
      }
      setCheckingBan(false);
    };

    checkBanStatus();
  }, [user]);

  if (loading || checkingBan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background cyber-grid">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <Gamepad2 className="w-16 h-16 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-rajdhani text-lg">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isBanned) {
    return (
      <div className="min-h-screen fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
        <div className="text-center">
          <div className="relative inline-block mb-8">
            <ShieldX className="w-24 h-24 text-destructive animate-pulse" />
            <div className="absolute inset-0 bg-destructive/40 blur-3xl rounded-full" />
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-destructive mb-4">
            Your Account is Blocked
          </h1>
          <p className="text-muted-foreground font-rajdhani text-lg mb-8 max-w-md mx-auto px-4">
            Access to this account has been suspended. Contact support if you believe this is an error.
          </p>
          <button
            onClick={() => signOut()}
            className="px-8 py-3 bg-destructive/20 hover:bg-destructive/30 text-destructive font-rajdhani font-semibold rounded-lg border border-destructive/40 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
