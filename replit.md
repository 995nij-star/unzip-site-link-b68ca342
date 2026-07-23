# Idexopn — Premium Esports Platform

A full-featured gaming tournament and esports platform with wallet, clips, live streams, leaderboards, messaging, and a comprehensive admin panel. Ported from Lovable to Replit.

## Run & Operate

- Frontend: **`artifacts/app: web`** workflow — React + Vite, served at `/` (port 23863)
- API server: **`artifacts/api-server: API Server`** workflow — Express, served at `/api` (port 8080)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API types after spec changes
- `pnpm run typecheck` — full typecheck across all packages
- `node scripts/check-destructive-sql.mjs` — verify no destructive SQL in migrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18, Vite, Tailwind CSS v3, shadcn/ui, react-router-dom v6
- Backend: Supabase (auth, database, edge functions, realtime, storage) — external, not hosted here
- State: TanStack Query v5
- UI: Radix UI primitives + shadcn, Lucide icons, Framer Motion

## Where things live

- `artifacts/app/src/` — all frontend source code
- `artifacts/app/src/pages/` — 77 route pages (including 38 admin pages)
- `artifacts/app/src/components/` — UI components
- `artifacts/app/src/hooks/` — React hooks (useAuth, useAdmin, etc.)
- `artifacts/app/src/integrations/supabase/` — Supabase client + generated types
- `artifacts/app/src/contexts/` — ThemeContext, LanguageContext
- `artifacts/app/src/lib/` — utilities, capacitor init, MCP stubs
- `artifacts/app/tailwind.config.ts` — Tailwind v3 theme (neon color palette, Space Grotesk font)
- `artifacts/app/src/index.css` — full CSS design system (light + dark modes, custom animations)

## Architecture decisions

- **Supabase backend is kept as-is** — auth, database, 20+ edge functions, realtime, and storage all run on Supabase. The Replit app is purely the frontend host.
- **Lovable-specific packages removed** — `lovable-tagger`, `@lovable.dev/mcp-js`, `@lovable.dev/cloud-auth-js`, `virtual:pwa-register` all stubbed or removed.
- **Tailwind v3 via postcss.config.js** — not @tailwindcss/vite (incompatible with the app's v3 config).
- **Capacitor plugins kept** — `initCapacitor()` is called at boot but no-ops on web (`Capacitor.isNativePlatform()` returns false).
- **react-router-dom BrowserRouter** — routes are not base-path-prefixed because the artifact is at `/`.

## Product

- User auth (Supabase: email/password + Google OAuth)
- Tournaments: join, compete, win prizes
- Wallet: add money, send money, gift codes, withdrawals
- Clips & Reels: upload, discover, follow creators
- Live Streams: watch and host
- Messages: direct messaging between users
- Leaderboard, Search, Notifications, Premium
- Full admin panel (users, wallets, fraud, KYC, AI assistant, site scanner, and more)

## User preferences

- Keep existing Supabase backend — do not migrate or replace it.

## Gotchas

- Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be set as env vars for the app to connect to Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` is required by the API server's `POST /api/admin/bootstrap` route (stored as a Replit Secret).
- Do not run `pnpm dev` at the workspace root — no dev script there. Use the artifact workflows.
- Tailwind is v3 (not v4) — use `tailwind.config.ts` + `postcss.config.js`, not `@tailwindcss/vite`.
- Supabase client uses a custom fetch wrapper to handle `sb_publishable_*` key format (strips the Authorization bearer header, uses `apikey` header instead).

## GitHub Workflows

- **`ci.yml`** — destructive SQL guard + pnpm build & typecheck on push/PR to main
- **`deno.yml`** — Deno lint on `supabase/functions/` when edge function files change
- **`deploy-supabase-functions.yml`** — deploys all 23 edge functions to Supabase on push to main (requires `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` GitHub secrets)
- **`generator-generic-ossf-slsa3-publish.yml`** — SLSA provenance

## Supabase

- Project ref: `gfmklajfrwvjiujrfthb`
- 125 migration files in `supabase/migrations/`
- 23 edge functions in `supabase/functions/`
- Types generated in `artifacts/app/src/integrations/supabase/types.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
