import { cpSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CATALOG_STATIC_DIR = fileURLToPath(new URL('../backend/static', import.meta.url))
const CATALOG_OUTPUT_DIR = fileURLToPath(new URL('./dist/static', import.meta.url))

function copyCatalogMedia(): Plugin {
  return {
    name: 'copy-catalog-media',
    closeBundle(): void {
      rmSync(CATALOG_OUTPUT_DIR, { recursive: true, force: true })
      cpSync(CATALOG_STATIC_DIR, CATALOG_OUTPUT_DIR, { recursive: true })
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    copyCatalogMedia(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['host.docker.internal'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
