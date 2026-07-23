---
name: Lovable→Replit migration pattern
description: Key decisions and quirks from porting this Lovable/Supabase esports app to Replit pnpm monorepo
---

## Supabase client key format
The project uses new Supabase API keys (`sb_publishable_*`). These are opaque strings, not JWTs. A custom fetch wrapper in `artifacts/app/src/integrations/supabase/client.ts` strips the `Authorization: Bearer` header and uses `apikey` header instead. Do not remove this wrapper.

**Why:** Supabase's new key format breaks the default supabase-js client auth header logic.

**How to apply:** Keep the `createSupabaseFetch` wrapper whenever regenerating or updating the client.

## Migration files location
125 SQL migration files live in `supabase/migrations/`. They were originally in `.migration-backup/supabase/migrations/` and restored during setup. Do not delete `.migration-backup/` — it contains the original Lovable project source as a reference.

## Edge functions
23 Deno edge functions are in `supabase/functions/`. They use HTTPS imports (`https://deno.land/std`, `https://esm.sh/`) — no `deno.json` needed. Deployed via `.github/workflows/deploy-supabase-functions.yml` using `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` GitHub secrets.

## Tailwind version
Tailwind v3 via PostCSS — `tailwind.config.ts` + `postcss.config.js`. NOT `@tailwindcss/vite` (v4). Do not upgrade.

**Why:** The app's CSS design system uses v3 config syntax. v4 would require a full CSS rewrite.

## Required secrets / env vars
- `VITE_SUPABASE_URL` — set as plain env var (shared)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — set as plain env var (shared)
- `SUPABASE_SERVICE_ROLE_KEY` — Replit Secret, used by API server bootstrap route only

## Artifact registration
The `artifacts/app` directory existed on import but wasn't registered in the Replit artifact system. Fix: temporarily move the directory, call `createArtifact`, then restore source files. The new artifact gets a fresh port (23863).

## API server
Express server at `artifacts/api-server/`, served at `/api` (port 8080). Only has one real route: `POST /api/admin/bootstrap` — grants admin/super_admin roles to a user by upserting into `user_roles` table using service role key.
