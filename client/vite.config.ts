import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const clientPort = process.env.COGNAC_CLIENT_PORT ? Number(process.env.COGNAC_CLIENT_PORT) : 5173
const serverPort = process.env.COGNAC_SERVER_PORT ? Number(process.env.COGNAC_SERVER_PORT) : 4000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: clientPort,
    proxy: {
      '/api': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
      },
    },
  },
})
