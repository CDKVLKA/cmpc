/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/cmpc/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png", "snapshot.json"],
      manifest: {
        name: "Chris' Mega Pint Collection",
        short_name: "CMPC",
        description: "Retro-Spielesammlung – stöbern, filtern, offline lesen.",
        lang: "de",
        dir: "ltr",
        start_url: "/cmpc/",
        scope: "/cmpc/",
        display: "standalone",
        orientation: "any",
        background_color: "#141c2f",
        theme_color: "#151d31",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,json,png,ico}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(upload\.wikimedia\.org|commons\.wikimedia\.org)\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "cmpc-covers",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/sheets\.googleapis\.com\//i,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
