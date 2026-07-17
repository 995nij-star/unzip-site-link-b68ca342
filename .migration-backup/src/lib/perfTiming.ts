/**
 * Lightweight request timing logger.
 *
 * Wrap any async network call with `timed("label", () => fn())` to log:
 *   [perf] label … 234ms ✓
 *   [perf] label … 812ms ✗ (error message)
 *
 * Slow calls (>800ms) are logged as warnings so they're easy to spot
 * in the console. All entries are also pushed to `window.__authTimings`
 * for quick inspection (e.g. `console.table(window.__authTimings)`).
 */

export interface TimingEntry {
  label: string;
  ms: number;
  ok: boolean;
  error?: string;
  at: string;
}

declare global {
  interface Window {
    __authTimings?: TimingEntry[];
  }
}

const SLOW_MS = 800;

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const at = new Date().toISOString();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    const entry: TimingEntry = { label, ms, ok: true, at };
    push(entry);
    if (ms >= SLOW_MS) {
      console.warn(`[perf] ${label} … ${ms}ms ✓ (slow)`);
    } else {
      console.log(`[perf] ${label} … ${ms}ms ✓`);
    }
    return result;
  } catch (err: any) {
    const ms = Math.round(performance.now() - start);
    const msg = err?.message ?? String(err);
    push({ label, ms, ok: false, error: msg, at });
    console.error(`[perf] ${label} … ${ms}ms ✗ — ${msg}`);
    throw err;
  }
}

function push(entry: TimingEntry) {
  if (typeof window === "undefined") return;
  if (!window.__authTimings) window.__authTimings = [];
  window.__authTimings.push(entry);
  // Keep last 50 entries only
  if (window.__authTimings.length > 50) {
    window.__authTimings.splice(0, window.__authTimings.length - 50);
  }
}
