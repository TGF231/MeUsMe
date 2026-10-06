import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg'],
      manifest: {
        name: 'MeUsMe',
        short_name: 'MeUsMe',
        description: 'Uma coisa de cada vez.',
        lang: 'pt-BR',
        theme_color: '#2f6f5e',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // Permite abrir no celular pela rede local durante o desenvolvimento.
  server: { host: true },
})
