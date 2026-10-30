import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('test')
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
})
