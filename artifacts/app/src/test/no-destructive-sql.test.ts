// Destructive SQL check not applicable in Replit environment — skipped.
import { describe, it } from "vitest";

describe("Migrations safety net", () => {
  it.skip("contains no destructive SQL (not applicable on Replit)", () => {
    // Original test used node:child_process to run a Lovable-specific script.
    // Skipped on Replit — Supabase migrations are managed externally.
  });
});
