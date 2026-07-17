import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import { Loader2, Gamepad2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
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

  return <Dashboard />;
};

export default Index;
