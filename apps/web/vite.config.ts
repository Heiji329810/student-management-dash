import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"


// https://vite.dev/config/
export default defineConfig({
  cacheDir: path.resolve(__dirname, 'node_modules', `.vite-${new URL(process.env.APP_ORIGIN || 'http://localhost:5275').port || 'default'}`),
  server: { host: '127.0.0.1', port: 5275, strictPort: true, allowedHosts: ['localhost', '192.168.101.93'], fs: { allow: [__dirname, path.resolve(__dirname, '../../shared'), path.resolve(__dirname, '../../node_modules')], deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local/**'] }, proxy: { '/api': process.env.API_TARGET || 'http://127.0.0.1:4100' } },
  preview: { host: '127.0.0.1', port: 5275, strictPort: true },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
