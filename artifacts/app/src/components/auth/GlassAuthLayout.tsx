import { ReactNode } from "react";
import { Gamepad2, Sparkles } from "lucide-react";
import { useLowEffectsMode } from "@/hooks/useLowEffectsMode";


interface GlassAuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function GlassAuthLayout({ children, title, subtitle }: GlassAuthLayoutProps) {
  const lowEffects = useLowEffectsMode();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[hsl(260_30%_6%)]"
      data-low-effects={lowEffects ? "true" : "false"}
    >
      {/* In low-effects mode: render only base gradient + card. Skip grid, blobs, horizon, city. */}
      {lowEffects && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, hsl(260 30% 6%) 0%, hsl(260 30% 9%) 100%)',
          }}
        />
      )}
      {!lowEffects && (
       <>
      {/* Static layered background — single paint, no animation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(260 30% 6%) 0%, hsl(270 35% 12%) 30%, hsl(250 40% 8%) 60%, hsl(210 30% 8%) 80%, hsl(260 25% 4%) 100%)',
        }}
      />

      {/* Static cyber grid — no animation */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(210 100% 60%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(210 100% 60%) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Two static glow blobs — pure radial gradients, GPU-composited, no blur filter */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 360,
          height: 360,
          left: '-8%',
          top: '8%',
          background:
            'radial-gradient(circle, hsl(210 100% 55% / 0.22) 0%, transparent 65%)',
          willChange: 'auto',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          left: '62%',
          top: '52%',
          background:
            'radial-gradient(circle, hsl(270 100% 65% / 0.18) 0%, transparent 65%)',
        }}
      />

      {/* Horizon glow line — static */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          top: '65%',
          background:
            'linear-gradient(90deg, transparent 5%, hsl(210 100% 55% / 0.3) 30%, hsl(270 100% 65% / 0.5) 50%, hsl(320 100% 60% / 0.3) 70%, transparent 95%)',
        }}
      />

      {/* Dark city silhouettes — static SVG */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none">
        <svg className="absolute bottom-0 w-full h-full opacity-60" preserveAspectRatio="none" viewBox="0 0 1440 320">
          <path
            fill="hsl(260 30% 8% / 0.8)"
            d="M0,224L48,208C96,192,192,160,288,154.7C384,149,480,171,576,186.7C672,203,768,213,864,202.7C960,192,1056,160,1152,149.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
        <div
          className="absolute bottom-0 left-0 right-0 h-20"
          style={{
            background: 'hsl(260 25% 3%)',
            clipPath:
              'polygon(0% 100%, 0% 60%, 2% 40%, 4% 60%, 5% 30%, 7% 60%, 8% 45%, 10% 60%, 12% 25%, 14% 60%, 15% 50%, 17% 60%, 20% 35%, 22% 60%, 25% 40%, 28% 60%, 30% 20%, 32% 60%, 35% 45%, 38% 60%, 40% 30%, 42% 60%, 45% 50%, 48% 60%, 50% 25%, 52% 60%, 55% 40%, 58% 60%, 60% 35%, 62% 60%, 65% 45%, 68% 60%, 70% 20%, 72% 60%, 75% 50%, 78% 60%, 80% 30%, 82% 60%, 85% 40%, 88% 60%, 90% 25%, 92% 60%, 95% 45%, 98% 60%, 100% 40%, 100% 100%)',
          }}
        />
      </div>
       </>
      )}

      {/* Main card */}
      <div className="relative w-full max-w-md z-10">
        {/* Premium Logo + Branding */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center gap-3 mb-2 group">
            {/* Logo badge with gradient ring */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl blur-md opacity-70"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(210 100% 55%), hsl(270 100% 65%), hsl(320 100% 60%))',
                }}
              />
              <div
                className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(260 30% 12%), hsl(270 25% 8%))',
                  border: '1px solid hsl(210 100% 55% / 0.5)',
                  boxShadow:
                    'inset 0 1px 0 hsl(210 100% 70% / 0.25), 0 4px 14px hsl(270 100% 65% / 0.25)',
                }}
              >
                <Gamepad2 className="w-6 h-6 text-primary drop-shadow-[0_0_8px_hsl(210_100%_55%/0.8)]" />
              </div>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-2xl font-orbitron font-bold text-gradient-neon tracking-wide">
                Idexopn
              </span>
              <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-[0.18em] uppercase font-orbitron"
                style={{
                  background: 'linear-gradient(90deg, hsl(45 100% 55% / 0.15), hsl(320 100% 60% / 0.15))',
                  border: '1px solid hsl(45 100% 55% / 0.35)',
                  color: 'hsl(45 100% 70%)',
                }}
              >
                <Sparkles className="w-2.5 h-2.5" /> Premium Esports
              </span>
            </div>
          </div>
        </div>

        {/* Card with animated gradient border */}
        <div className="relative rounded-2xl p-[1.5px] overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, hsl(210 100% 55% / 0.55), hsl(270 100% 65% / 0.45), hsl(320 100% 60% / 0.55), hsl(185 100% 50% / 0.45))',
            backgroundSize: '300% 300%',
          }}
        >
          <div
            className="relative rounded-[14px] overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, hsl(260 30% 14%) 0%, hsl(270 25% 9%) 100%)',
              boxShadow:
                '0 20px 60px -10px hsl(270 100% 65% / 0.25), inset 0 1px 1px hsl(185 100% 60% / 0.08)',
            }}
          >
            {/* Top neon accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, hsl(210 100% 55%), hsl(270 100% 65%), hsl(320 100% 60%), transparent)',
              }}
            />

            {/* Corner accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-primary/40 rounded-tl-md pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-primary/40 rounded-tr-md pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-neon-purple/40 rounded-bl-md pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-neon-purple/40 rounded-br-md pointer-events-none" />

            <div className="p-8 sm:p-10">
              <div className="text-center mb-2">
                <h1 className="text-3xl font-bold font-orbitron text-gradient-neon tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm text-muted-foreground font-rajdhani">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Premium divider with diamond bullets */}
              <div className="flex items-center justify-center gap-2.5 mb-7 mt-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-primary/60" />
                <div className="w-1 h-1 rounded-full bg-primary/70 shadow-[0_0_6px_hsl(var(--primary))]" />
                <div className="w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-primary to-neon-purple shadow-[0_0_8px_hsl(270_100%_65%/0.8)]" />
                <div className="w-1 h-1 rounded-full bg-neon-purple/70 shadow-[0_0_6px_hsl(270_100%_65%)]" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent via-neon-purple/40 to-neon-purple/60" />
              </div>

              {children}
            </div>

            {/* Bottom neon accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, hsl(185 100% 50% / 0.4), hsl(270 100% 65% / 0.4), transparent)',
              }}
            />
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[10px] font-rajdhani uppercase tracking-[0.2em] text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-neon-green animate-pulse" />
            Secure
          </span>
          <span className="w-px h-3 bg-border/60" />
          <span>Encrypted</span>
          <span className="w-px h-3 bg-border/60" />
          <span>Verified</span>
        </div>
      </div>

    </div>
  );
}
