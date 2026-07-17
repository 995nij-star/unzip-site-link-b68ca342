import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png", "pwa-icon-maskable-512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB max file size
        importScripts: ["/sw-push.js"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "XT eSports - Gaming Tournament Platform",
        short_name: "XT eSports",
        description: "Join tournaments, compete with gamers, and win prizes on the ultimate esports platform.",
        theme_color: "#0a0a1a",
        background_color: "#0a0a1a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/?source=pwa",
        id: "/",
        categories: ["games", "entertainment", "social"],
        lang: "en",
        dir: "ltr",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
        screenshots: [
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "XT eSports Home",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
            label: "XT eSports Dashboard",
          },
        ],
        shortcuts: [
          {
            name: "Tournaments",
            short_name: "Tournaments",
            url: "/tournaments",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Wallet",
            short_name: "Wallet",
            url: "/wallet",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Leaderboard",
            short_name: "Leaderboard",
            url: "/leaderboard",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: "@/integrations/supabase/client",
        replacement: path.resolve(__dirname, "./src/integrations/supabase/runtime-client.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
}));
