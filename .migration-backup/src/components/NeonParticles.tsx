import { useEffect, useRef, memo } from "react";

const PARTICLE_COUNT = 20; // Reduced from 35
const CONNECTION_DIST = 100; // Reduced from 120
const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
const COLORS = [
  "210,100%,55%",  // neon-blue (pre-formatted for hsla)
  "185,100%,50%",  // neon-cyan
  "270,100%,65%",  // neon-purple
  "320,100%,60%",  // neon-pink
  "145,100%,45%",  // neon-green
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colorIdx: number;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
}

export const NeonParticles = memo(function NeonParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let paused = false;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.offsetWidth;
      h = parent.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3 - 0.15,
        size: Math.random() * 2.5 + 1,
        colorIdx: Math.floor(Math.random() * COLORS.length),
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.025 + 0.008,
      }));
    };

    resize();
    initParticles();

    const ro = new ResizeObserver(() => {
      resize();
      // Re-clamp particles to new bounds
      for (const p of particles) {
        if (p.x > w) p.x = Math.random() * w;
        if (p.y > h) p.y = Math.random() * h;
      }
    });
    ro.observe(canvas.parentElement!);

    // Pause when not visible
    const io = new IntersectionObserver(
      ([entry]) => { paused = !entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(canvas);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      if (paused) return;

      ctx.clearRect(0, 0, w, h);

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap
        if (p.x < -8) p.x = w + 8;
        else if (p.x > w + 8) p.x = -8;
        if (p.y < -8) p.y = h + 8;
        else if (p.y > h + 8) p.y = -8;

        const sinP = Math.sin(p.pulse);
        const currentAlpha = p.alpha * (0.5 + 0.5 * sinP);
        const glowSize = p.size * (2 + sinP);
        const color = COLORS[p.colorIdx];

        // Glow (single radial gradient)
        const glowRadius = glowSize * 3;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        gradient.addColorStop(0, `hsla(${color},${currentAlpha})`);
        gradient.addColorStop(1, `hsla(${color},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${color},${Math.min(currentAlpha * 2, 1)})`;
        ctx.fill();
      }

      // Connection lines — O(n²) but n is only 20 now
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONNECTION_DIST_SQ) {
            const lineAlpha = (1 - Math.sqrt(distSq) / CONNECTION_DIST) * 0.12;
            ctx.strokeStyle = `hsla(210,100%,55%,${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{ willChange: "transform" }}
    />
  );
});
