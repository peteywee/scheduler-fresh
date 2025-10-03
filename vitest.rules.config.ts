import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/rules-setup.ts'],
    include: ['src/**/*.rules.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'node14',
  },
})