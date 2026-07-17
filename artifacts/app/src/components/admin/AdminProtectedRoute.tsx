import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Shield } from "lucide-react";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guards admin routes. Requires the user to be authenticated.
 * Data-level security is enforced by Supabase RLS — only users with
 * admin/moderator rows in user_roles can read admin data, so even if
 * an authenticated non-admin navigates here, all queries return empty.
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background cyber-grid">
        <div className="text-center space-y-4">
          <div className="relative">
            <Shield className="w-16 h-16 text-primary mx-auto animate-pulse" />
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground font-rajdhani">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying access…
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
