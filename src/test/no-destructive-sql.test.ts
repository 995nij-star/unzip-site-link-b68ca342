import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("Migrations safety net", () => {
  it("contains no destructive SQL (DROP/DELETE/TRUNCATE/DROP COLUMN)", () => {
    const script = resolve(process.cwd(), "scripts/check-destructive-sql.mjs");
    const result = spawnSync("node", [script], { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(
        `Destructive SQL guard failed:\n${result.stdout}\n${result.stderr}`
      );
    }
    expect(result.status).toBe(0);
  });
});
