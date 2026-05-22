import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sipera Bandung',
        short_name: 'Sipera',
        description: 'Sistem Perizinan Tata Ruang Kota Bandung',
        theme_color: '#1e3a8a',
        background_color: '#1e3a8a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'id',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            // OSM tiles cache (offline map)
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 86400 },
            },
          },
          {
            // API GET (non-mutating) cache stale-while-revalidate
            urlPattern: ({ request, url }) =>
              request.method === 'GET' && url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: { enabled: false }, // jangan aktifin di dev biar gak nge-cache aneh
    }),
  ],
  server: {
    port: Number(process.env.PORT ?? 5173),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
  },
});
