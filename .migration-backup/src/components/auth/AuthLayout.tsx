import { ReactNode } from "react";
import { Gamepad2 } from "lucide-react";
import trophyGold from "@/assets/trophy-gold.png";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-pink/3 rounded-full blur-3xl" />
      </div>

      {/* Cyber grid overlay */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* Neon particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => {
          const colors = [
            'hsl(210 100% 60%)',
            'hsl(270 100% 70%)',
            'hsl(320 100% 65%)',
            'hsl(185 100% 55%)',
          ];
          return (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-pulse"
              style={{
                background: colors[i % colors.length],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.2 + Math.random() * 0.3,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          );
        })}
      </div>

      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-scan-line" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Gamepad2 className="w-12 h-12 text-neon-blue" />
              <div className="absolute inset-0 bg-neon-blue/30 blur-xl rounded-full" />
            </div>
            <h1 className="text-4xl font-orbitron font-bold text-gradient-neon">
              Idexopn
            </h1>
          </div>
          <div className="w-32 h-1 mx-auto bg-gradient-to-r from-transparent via-neon-cyan to-transparent rounded-full" />
        </div>

        {/* Card */}
        <div className="relative premium-card-featured rounded-2xl shadow-neon overflow-hidden animate-glow-border">
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/60 to-transparent" />
          
          {/* Trophy decoration */}
          <div className="absolute -right-8 -top-8 opacity-10">
            <img src={trophyGold} alt="" className="w-32 h-32 object-contain" />
          </div>
          
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-orbitron font-bold text-gradient-neon mb-2">
                {title}
              </h2>
              <p className="text-muted-foreground font-rajdhani">
                {subtitle}
              </p>
            </div>

            {children}
          </div>

          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-neon-cyan/60 font-rajdhani">
          Compete. Conquer. Champion.
        </p>
      </div>
    </div>
  );
}
