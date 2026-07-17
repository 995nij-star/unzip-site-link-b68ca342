---
name: Lovable-to-Replit migration pattern
description: Key decisions and gotchas when porting a Lovable app to Replit's pnpm workspace, keeping Supabase as the backend.
---

## Decision: Keep Supabase backend, host only the frontend on Replit

**Why:** This app has 108 Supabase-using files, 20+ edge functions, realtime subscriptions, RLS, and storage. Full migration would be a separate large project. The user confirmed: keep Supabase.

**How to apply:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as workspace env vars. The Supabase client in `src/integrations/supabase/client.ts` picks them up at runtime.

## Packages to remove / stub from Lovable apps

- `lovable-tagger` — devDependency, drop from vite plugins (Lovable-only)
- `@lovable.dev/mcp-js` — stub `src/lib/mcp/index.ts` and all tool files with `export default null`
- `@lovable.dev/cloud-auth-js` — stub `src/integrations/lovable/index.ts` to delegate to supabase.auth.signInWithOAuth directly
- `virtual:pwa-register` — remove `registerSW(...)` from main.tsx (comes from vite-plugin-pwa which is Lovable-hosted)
- `@lovable.dev/mcp-js/stacks/supabase/vite` — drop from vite plugins

## Tailwind v3 setup on Replit

**Why:** Lovable apps use Tailwind v3 (not v4). The pnpm workspace scaffold uses `@tailwindcss/vite` (v4). The copy script swaps to v3 + postcss.config.js, removes `@tailwindcss/vite`.

**How to apply:** After copy script, vite.config.ts should NOT import tailwindcss. Use `postcss.config.js` with `{ tailwindcss: {}, autoprefixer: {} }`. The inline `css.postcss` in vite.config.ts conflicts — remove it and let postcss.config.js handle it.

## Copy script installs packages but may fail on node: built-ins

The `fullstack-copy-frontend.sh` script tries to install all detected imports, including `node:child_process` and `node:path` (built-ins), which causes pnpm errors. This is safe to ignore — the script continues. After the script, manually install the real missing packages:
- `react-router-dom`, `@supabase/supabase-js`, `@radix-ui/react-visually-hidden`, `react-markdown`
- `@capacitor/core`, `@capacitor/push-notifications`, `@capacitor/status-bar`
