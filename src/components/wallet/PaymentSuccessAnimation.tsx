import { useEffect } from "react";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";

interface PaymentSuccessAnimationProps {
  open: boolean;
  onDone: () => void;
  reference?: string;
  amountLabel?: string;
  durationMs?: number;
}

/**
 * Premium full-screen payment success animation.
 * Auto-dismisses after `durationMs` and calls `onDone`.
 */
export function PaymentSuccessAnimation({
  open,
  onDone,
  reference,
  amountLabel,
  durationMs = 2600,
}: PaymentSuccessAnimationProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onDone]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-xl animate-fade-in"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-neon-green/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full bg-neon-cyan/25 blur-3xl" />
      </div>

      {/* Confetti sparkles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-neon-cyan/70 animate-fade-in"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
              width: 12 + Math.random() * 18,
              height: 12 + Math.random() * 18,
              animationDelay: `${Math.random() * 0.6}s`,
              opacity: 0.6 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-4 max-w-md w-full rounded-3xl border-2 border-neon-green/40 bg-card/90 p-8 text-center shadow-[0_0_60px_-10px_hsl(var(--neon-green)/0.5)] animate-scale-in">
        {/* Success ring */}
        <div className="relative mx-auto mb-6 h-28 w-28">
          <div className="absolute inset-0 rounded-full border-4 border-neon-green/30" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-green animate-spin [animation-duration:1.2s]" />
          <div className="absolute inset-2 rounded-full bg-neon-green/10 flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-14 w-14 text-neon-green drop-shadow-[0_0_12px_hsl(var(--neon-green))]" />
          </div>
        </div>

        <h2 className="font-orbitron text-2xl font-bold text-foreground">
          Payment Verified
        </h2>
        {amountLabel && (
          <p className="mt-2 font-orbitron text-3xl text-neon-green drop-shadow-[0_0_8px_hsl(var(--neon-green)/0.6)]">
            {amountLabel}
          </p>
        )}

        <div className="mt-5 rounded-xl border border-neon-orange/40 bg-neon-orange/10 p-3 flex items-center gap-2 justify-center text-sm font-rajdhani text-neon-orange">
          <Clock className="h-4 w-4 animate-pulse" />
          Status: <span className="font-bold">Pending</span> · Awaiting admin approval
        </div>

        <p className="mt-4 text-sm text-muted-foreground font-rajdhani leading-relaxed">
          Your payment request has been submitted successfully and is waiting
          for admin approval. You'll be notified as soon as it's reviewed.
        </p>

        {reference && (
          <p className="mt-3 text-[11px] font-mono text-muted-foreground/80">
            Ref · {reference}
          </p>
        )}
      </div>
    </div>
  );
}
