import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'Blockly',
        short_name: 'Blockly',
        description: 'A 10×10 block-puzzle game.',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'any',
        lang: 'en',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,mp3,png,svg,ico,webmanifest}'],
      },
    }),
  ],
});
