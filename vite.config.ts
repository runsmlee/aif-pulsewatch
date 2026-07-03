/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // Ensure React resolves to the correct build:
    // - production builds get the production runtime (smaller, no dev warnings)
    // - test/dev get the development runtime (needed for act() in tests)
    'process.env.NODE_ENV':
      mode === 'production'
        ? JSON.stringify('production')
        : JSON.stringify('development'),
  },
  build: {
    rollupOptions: {
      treeshake: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
  },
}));
