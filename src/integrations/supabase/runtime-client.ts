import { supabase as generatedSupabase } from "./client";

// The imported project currently points at an empty backend schema, so the
// generated Database type has no tables and every `.from()` call resolves to
// `never`. Keep the generated client intact, but expose a permissive client
// for the imported code until the historical migrations are applied and types
// are regenerated from the real schema.
export const supabase = generatedSupabase as any;