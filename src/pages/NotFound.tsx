import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Gamepad2, Home, AlertTriangle } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cyber-grid relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center px-4">
        {/* Logo */}
        <div className="inline-flex items-center justify-center gap-3 mb-8">
          <Gamepad2 className="w-10 h-10 text-primary" />
          <span className="text-2xl font-orbitron font-bold text-gradient-neon">
            Idexopn
          </span>
        </div>

        {/* Error icon */}
        <div className="relative inline-block mb-6">
          <AlertTriangle className="w-24 h-24 text-destructive" />
          <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
        </div>

        {/* Error text */}
        <h1 className="text-7xl font-orbitron font-bold text-foreground mb-4">
          4<span className="text-gradient-fire">0</span>4
        </h1>
        <p className="text-xl text-muted-foreground font-rajdhani mb-8 max-w-md mx-auto">
          Oops! Looks like you've ventured into unknown territory. This arena doesn't exist.
        </p>

        {/* Action button */}
        <Link to="/">
          <CyberButton size="lg">
            <Home className="w-5 h-5" />
            Return to Base
          </CyberButton>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
