import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Shield, Gamepad2 } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";
import { LoginHistorySection } from "@/components/LoginHistorySection";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useAuth } from "@/hooks/useAuth";

export default function Sessions() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="relative">
              <Gamepad2 className="w-8 h-8 text-neon-blue" />
              <div className="absolute inset-0 bg-neon-blue/30 blur-lg rounded-full" />
            </div>
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Idexopn</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <ProfileDropdown />
            <CyberButton variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </CyberButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <CyberButton variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </CyberButton>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-neon-purple" />
              <span className="text-sm font-rajdhani font-semibold text-neon-purple uppercase tracking-wider">
                Security
              </span>
            </div>
            <h1 className="text-3xl font-orbitron font-bold text-foreground">Session Log</h1>
            <p className="text-sm text-muted-foreground font-rajdhani mt-1">
              Review and manage devices that have signed into your account.
            </p>
          </div>
        </div>

        <LoginHistorySection />
      </main>
    </div>
  );
}
