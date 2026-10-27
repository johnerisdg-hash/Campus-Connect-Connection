import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'http://127.0.0.1:3000';   // LavaLust backend

export default defineConfig({
  plugins: [react()],
  server:  { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
  preview: { proxy: { '/api': { target, changeOrigin: true } } }
});