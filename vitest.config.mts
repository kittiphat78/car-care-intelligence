import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// The shop and its devices run on Asia/Bangkok. Pin the suite to it so results do not
// depend on the machine (e.g. UTC on CI); tests that need another zone set TZ themselves.
process.env.TZ = 'Asia/Bangkok'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    passWithNoTests: true,
    // e2e/ is Playwright (npm run test:e2e), not Vitest
    exclude: ['**/node_modules/**', '**/.next/**', 'e2e/**'],
  },
})
