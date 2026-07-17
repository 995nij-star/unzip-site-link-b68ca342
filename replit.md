# Idexopn — Premium Esports Platform

A full-featured gaming tournament and esports platform with wallet, clips, live streams, leaderboards, messaging, and a comprehensive admin panel. Ported from Lovable to Replit.

## Run & Operate

- Workflows manage the dev server — use Replit's workflow panel to start/stop
- Frontend artifact: `artifacts/app/` — React + Vite, served at `/`
- `pnpm --filter @workspace/app run dev` — run frontend locally (requires PORT + BASE_PATH env)
- `pnpm run typecheck` — full typecheck across all packages

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
- Do not run `pnpm dev` at the workspace root — no dev script there. Use `pnpm --filter @workspace/app run dev` or the workflow.
- Tailwind is v3 (not v4) — use `tailwind.config.ts` + `postcss.config.js`, not `@tailwindcss/vite`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
