import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  define: { __VERSAO__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registrado manualmente em main.tsx (só na web).
      injectRegister: null,
      includeAssets: ['icone.svg'],
      // Páginas estáticas (política de privacidade) não podem cair no fallback do app.
      workbox: { navigateFallbackDenylist: [/privacidade\.html$/] },
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
  // Expõe o servidor de desenvolvimento na rede local.
  server: { host: true },
  // Base configurável para hospedagem em subcaminho (ex.: GitHub Pages).
  base: process.env.BASE_PATH ?? '/',
})
