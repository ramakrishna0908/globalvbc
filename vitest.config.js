import { defineConfig } from 'vitest/config';

// Root config runs the shared engine tests. Backend and frontend have their own.
export default defineConfig({
  test: {
    include: ['shared/**/*.test.js'],
    environment: 'node',
  },
});
