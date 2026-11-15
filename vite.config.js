import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, assetsInlineLimit: 2048 },
  server: { port: 5173, strictPort: false },
});
