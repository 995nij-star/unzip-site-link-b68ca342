import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = "/vercel/share/v0-project/supabase/migrations";
const connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("[v0] No POSTGRES connection string found in env");
  process.exit(1);
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`[v0] Found ${files.length} migration files`);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("[v0] Connected to database");

let applied = 0;
for (const file of files) {
  const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8").trim();
  if (!sql) {
    console.log(`[v0] SKIP (empty): ${file}`);
    continue;
  }
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    applied++;
    console.log(`[v0] OK   (${applied}/${files.length}): ${file}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(`\n[v0] FAILED at: ${file}`);
    console.error(`[v0] Error: ${err.message}`);
    console.error(`[v0] Detail: ${err.detail || "-"}`);
    console.error(`[v0] Hint: ${err.hint || "-"}`);
    await client.end();
    process.exit(2);
  }
}

await client.end();
console.log(`\n[v0] DONE. Applied ${applied} migrations successfully.`);
