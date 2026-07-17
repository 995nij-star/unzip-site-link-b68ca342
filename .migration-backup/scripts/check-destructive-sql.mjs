#!/usr/bin/env node
/**
 * Blocks destructive SQL in supabase/migrations.
 *
 * Forbidden (case-insensitive, whole-word):
 *   - DROP TABLE / DROP SCHEMA / DROP DATABASE / DROP VIEW / DROP MATERIALIZED VIEW
 *   - DROP COLUMN (via ALTER TABLE ... DROP COLUMN)
 *   - DELETE FROM
 *   - TRUNCATE
 *
 * Per-line opt-out: append `-- @allow-destructive` on the offending line.
 * File-level opt-out: include `-- @allow-destructive-file` anywhere in the file
 * (use sparingly; requires explicit human review).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "supabase/migrations");

const RULES = [
  { name: "DROP TABLE",             re: /\bdrop\s+table\b/i },
  { name: "DROP SCHEMA",            re: /\bdrop\s+schema\b/i },
  { name: "DROP DATABASE",          re: /\bdrop\s+database\b/i },
  { name: "DROP VIEW",              re: /\bdrop\s+(materialized\s+)?view\b/i },
  { name: "ALTER ... DROP COLUMN",  re: /\bdrop\s+column\b/i },
  { name: "DELETE FROM",            re: /\bdelete\s+from\b/i },
  { name: "TRUNCATE",               re: /\btruncate\b/i },
];

function walk(dir) {
  let out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out = out.concat(walk(p));
    else if (name.endsWith(".sql")) out.push(p);
  }
  return out;
}

function stripStringsAndComments(line) {
  // Remove '...' and "..." string literals and -- line comments before matching.
  let out = "";
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    const n = line[i + 1];
    if (c === "-" && n === "-") break; // rest is comment
    if (c === "'" || c === '"') {
      const quote = c;
      i++;
      while (i < line.length && line[i] !== quote) i++;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const files = walk(ROOT);
const violations = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (text.includes("@allow-destructive-file")) continue;
  const lines = text.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (raw.includes("@allow-destructive")) continue;
    const code = stripStringsAndComments(raw);
    for (const rule of RULES) {
      if (rule.re.test(code)) {
        violations.push({ file, line: idx + 1, rule: rule.name, text: raw.trim() });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\n❌ Destructive SQL detected in migrations:\n");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`    > ${v.text}`);
  }
  console.error(
    `\n${violations.length} violation(s). Destructive SQL is forbidden.\n` +
      `If a statement is genuinely intentional and reviewed, append \`-- @allow-destructive\` on that line.\n`
  );
  process.exit(1);
}

console.log(`✅ No destructive SQL found across ${files.length} migration file(s).`);
