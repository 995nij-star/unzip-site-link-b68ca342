import { useEffect, useState } from "react";

/**
 * Detects low-end devices or runtime performance pressure and returns
 * `true` when the UI should switch to a reduced-effects mode.
 *
 * Heuristics:
 *  - prefers-reduced-motion media query
 *  - navigator.hardwareConcurrency <= 4
 *  - navigator.deviceMemory <= 4 (GB)
 *  - Network Information saveData / effective 2g/3g
 *  - Live FPS sampling (~1s window). If avg FPS < 45, switch to low mode.
 */
export function useLowEffectsMode(): boolean {
  const [lowMode, setLowMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      if (mql?.matches) return true;

      const cores = (navigator as any).hardwareConcurrency ?? 8;
      const mem = (navigator as any).deviceMemory ?? 8;
      if (cores <= 4 || mem <= 4) return true;

      const conn = (navigator as any).connection;
      if (conn?.saveData) return true;
      if (conn?.effectiveType && /(^|-)2g|3g/.test(conn.effectiveType)) return true;
    } catch {
      /* ignore */
    }
    return false;
  });

  useEffect(() => {
    if (lowMode) return; // already low; no need to sample
    if (typeof window === "undefined") return;

    let raf = 0;
    let frames = 0;
    let start = performance.now();
    let cancelled = false;
    // Sample for ~1.5s after mount to avoid first-paint noise
    const sampleStart = performance.now();

    const tick = (t: number) => {
      if (cancelled) return;
      frames++;
      const elapsed = t - start;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        if (fps < 45 && t - sampleStart > 500) {
          setLowMode(true);
          return;
        }
        frames = 0;
        start = t;
      }
      // Stop after 4s of healthy FPS
      if (t - sampleStart > 4000) return;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [lowMode]);

  return lowMode;
}
