import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Run test files sequentially to avoid exhausting the connection pool
    // when integration tests run alongside unit tests that create PrismaClients.
    maxWorkers: 1,
    minWorkers: 1,
  },
})
