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
      // Versão nova espera: o app avisa e atualiza quando a pessoa tocar em Atualizar (main.tsx), sem recarregar no
      // meio de uma digitação.
      registerType: 'prompt',
      // Registrado manualmente em main.tsx (só na web).
      injectRegister: null,
      includeAssets: ['icone.svg', 'icones/*.png'],
      // Páginas estáticas (política de privacidade) não podem cair no fallback do app.
      // woff2: as fontes do MegUI vão no pacote e precisam funcionar offline.
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], navigateFallbackDenylist: [/(privacidade|termos)\.html$/] },
      manifest: {
        name: 'MeUsMe',
        short_name: 'MeUsMe',
        description: 'Programa de organização de tarefas: captura rápida, um passo por vez, agenda e finanças no mesmo lugar.',
        lang: 'pt-BR',
        dir: 'ltr',
        // Identidade estável do app instalado: não muda se o endereço de início mudar.
        id: './',
        theme_color: '#7d0e0e',
        // Fundo da tela de abertura: o cinza claro do MegUI 2.0.
        background_color: '#f8f8f8',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        categories: ['productivity', 'utilities', 'finance'],
        // PNG de 192 e 512 para a instalação do Android (vira app de verdade); o maskable deixa o sistema recortar.
        icons: [
          { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        // Toque longo no ícone: abre a captura direto (src/entrada.ts).
        shortcuts: [
          { name: 'Capturar', short_name: 'Capturar', description: 'Anotar algo para organizar depois', url: '?abrir=1', icons: [{ src: 'icones/icone-192.png', sizes: '192x192' }] },
          { name: 'Capturar por voz', short_name: 'Voz', description: 'Falar o que precisa anotar', url: '?voz=1', icons: [{ src: 'icones/icone-192.png', sizes: '192x192' }] },
        ],
        // Instalado, o MeUsMe aparece no "Compartilhar" do sistema; o que chega vai para a Caixa (src/entrada.ts).
        share_target: { action: '.', method: 'GET', params: { title: 'titulo', text: 'texto', url: 'link' } },
      },
    }),
  ],
  // Expõe o servidor de desenvolvimento na rede local.
  server: { host: true },
  // Base configurável para hospedagem em subcaminho (ex.: GitHub Pages).
  base: process.env.BASE_PATH ?? '/',
})
