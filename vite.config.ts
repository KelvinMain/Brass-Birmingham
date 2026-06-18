import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { devDebugLogPlugin } from './debug/viteDevLogPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devDebugLogPlugin()],
  server: {
    host: true,
    port: 15173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
})
