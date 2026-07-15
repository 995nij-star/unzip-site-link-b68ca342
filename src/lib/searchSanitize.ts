/**
 * Escape/strip characters that have special meaning in PostgREST filter
 * strings (used with `.or()`, `.ilike()`, etc.). Without this, a user could
 * inject extra filter clauses by typing commas, parentheses, dots, colons,
 * asterisks, or quotes into a search box.
 *
 * We take a conservative allow-list approach: keep letters, digits, spaces,
 * dashes, and underscores. Everything else is dropped. Result is also length
 * capped to prevent abuse of very long filter strings.
 */
export function sanitizeSearchTerm(input: string, maxLength = 64): string {
  if (!input) return "";
  return input
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .slice(0, maxLength);
}
