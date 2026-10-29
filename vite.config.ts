import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { '/backend': { target: 'http://127.0.0.1:3001', rewrite: path => path.replace(/^\/backend/, '') } } },
  preview: { proxy: { '/backend': { target: 'http://127.0.0.1:3001', rewrite: path => path.replace(/^\/backend/, '') } } },
})
