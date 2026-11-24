import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Run test files sequentially to avoid exhausting Neon's connection pool
    // when integration tests (sweeper.integration.test.js) run alongside unit
    // tests that also create PrismaClient instances.
    poolOptions: {
      threads: { maxThreads: 1 },
      forks:   { maxForks:   1 },
    },
  },
})
