import { useState } from "react";
import { Shield, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

/**
 * Shown at the top of the admin dashboard when isAdmin is still false.
 * Calls /api/admin/bootstrap (server-side, uses service-role key) to
 * insert the admin row in user_roles, then invalidates the role cache
 * so the sidebar and queries reload immediately.
 */
export function AdminBootstrap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleBootstrap = async () => {
    if (!user) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No active session token.");

      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      // Invalidate role cache so useAdmin refetches immediately
      await queryClient.invalidateQueries({ queryKey: ["adminAccess"] });
      setStatus("done");

      // Hard reload after a short delay so all admin queries restart fresh
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neon-green/30 bg-neon-green/5 px-5 py-4 mb-6">
        <CheckCircle2 className="w-5 h-5 text-neon-green shrink-0" />
        <div>
          <p className="text-sm font-orbitron font-bold text-neon-green">Admin access granted!</p>
          <p className="text-xs text-muted-foreground font-rajdhani mt-0.5">Reloading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neon-orange/30 bg-neon-orange/5 px-5 py-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-orbitron font-bold text-neon-orange">Admin role not detected</p>
          <p className="text-xs text-muted-foreground font-rajdhani mt-1">
            Your account is missing the admin role in the database. Click below to grant it — this runs once and fixes all admin data access.
          </p>
          {status === "error" && (
            <p className="text-xs text-destructive font-rajdhani mt-1">{errorMsg}</p>
          )}
        </div>
        <button
          onClick={handleBootstrap}
          disabled={status === "loading"}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-orange/15 border border-neon-orange/40 hover:bg-neon-orange/25 transition-colors text-neon-orange text-xs font-orbitron font-bold disabled:opacity-50"
        >
          {status === "loading" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shield className="w-3.5 h-3.5" />
          )}
          {status === "loading" ? "Granting…" : "Fix Now"}
        </button>
      </div>
    </div>
  );
}
