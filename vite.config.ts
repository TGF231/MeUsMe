import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registrado à mão em main.tsx, só fora do app Android.
      injectRegister: null,
      includeAssets: ['icone.svg'],
      manifest: {
        name: 'MeUsMe',
        short_name: 'MeUsMe',
        description: 'Uma coisa de cada vez.',
        lang: 'pt-BR',
        theme_color: '#7d0e0e',
        background_color: '#f4f6f8',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // Permite abrir no celular pela rede local durante o desenvolvimento.
  server: { host: true },
  // No GitHub Pages o app fica em /MeUsMe/; localmente, na raiz.
  base: process.env.BASE_PATH ?? '/',
})
