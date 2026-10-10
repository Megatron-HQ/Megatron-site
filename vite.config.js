import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const DEVELOPMENT_PORT = 5173
const PRODUCTION_PREVIEW_PORT = 4173

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@preview': resolve('src/preview'),
      '@': resolve('vendor/megatron/src/renderer/src')
    }
  },
  server: { strictPort: true, port: DEVELOPMENT_PORT },
  preview: { strictPort: true, port: PRODUCTION_PREVIEW_PORT },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        site: resolve('index.html'),
        preview: resolve('preview/index.html')
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules\/(?:react|react-dom|scheduler)\//
            },
            {
              name: 'preview-ui',
              test: /node_modules\/(?:radix-ui|@radix-ui|motion|motion-dom|motion-utils|framer-motion)\//
            },
            {
              name: 'preview-markdown',
              test: /node_modules\/(?:react-markdown|remark[^/]*|micromark[^/]*|mdast[^/]*|hast[^/]*|unist[^/]*|vfile[^/]*|unified)\//
            }
          ]
        }
      }
    }
  }
})
