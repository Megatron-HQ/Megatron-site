import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const DEVELOPMENT_PORT = 5173
const PRODUCTION_PREVIEW_PORT = 4173

export default defineConfig({
  plugins: [tailwindcss()],
  server: { strictPort: true, port: DEVELOPMENT_PORT },
  preview: { strictPort: true, port: PRODUCTION_PREVIEW_PORT },
  build: { target: 'es2022' }
})
