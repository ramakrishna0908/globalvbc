import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The shared volleyball engine lives outside the frontend root so the backend
// can import the very same reducer.
const engineDir = fileURLToPath(new URL('../shared/engine', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@engine': engineDir },
  },
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
