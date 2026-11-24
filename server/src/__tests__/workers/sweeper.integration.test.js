/**
 * Integration tests: sweepIndex must NOT re-enqueue an article or user profile
 * after handleIndex has already set indexedAt, as long as contentUpdatedAt has
 * not advanced.
 *
 * Safety rules (enforced at module load time, before any test runs):
 *   1. TEST_DATABASE_URL must be set.
 *   2. TEST_DATABASE_URL must NOT equal DATABASE_URL — prevents accidental
 *      use of the production Neon branch.
 *
 * Uses a dedicated PrismaClient pointed at TEST_DATABASE_URL.
 * ai-core and jobQueue are mocked — only the DB round-trip is real.
 *
 * Run alongside the unit test suite: `npm test`.
 * Skipped automatically when TEST_DATABASE_URL is absent or equals DATABASE_URL.
 */

// Load .env before any prisma import so env vars are available
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })

const TEST_DB_URL  = process.env.TEST_DATABASE_URL
const PROD_DB_URL  = process.env.DATABASE_URL

// Point DATABASE_URL at the test branch BEFORE requiring any module that
// transitively requires prismaClient — prismaClient reads DATABASE_URL at
// instantiation time and vitest gives each file a fresh module cache.
if (TEST_DB_URL && TEST_DB_URL !== PROD_DB_URL) {
  process.env.DATABASE_URL = TEST_DB_URL
}

const { PrismaClient } = require('@prisma/client')
const aiCore   = require('../../lib/aiCoreClient')
const jobQueue = require('../../integrations/queue/jobQueue')
const { handleIndex } = require('../../workers/aiWorker')
const { sweepIndex }  = require('../../workers/moderationSweeper')

// Skip when no test DB is configured or when it would hit production
const SKIP = !TEST_DB_URL || TEST_DB_URL === PROD_DB_URL

// Create an isolated PrismaClient using the test DB — never the shared prismaClient
const prisma = SKIP ? null : new PrismaClient({ datasourceUrl: TEST_DB_URL })

// ─── Article: no double-index ──────────────────────────────────────────────────

describe.skipIf(SKIP)('sweepIndex integration — no double-index after handleIndex (article)', () => {
  let userId
  let articleId

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where:  { email: 'integration-test-sweeper@artixhub.internal' },
      update: {},
      create: {
        provider:        'system',
        providerId:      'integration-test-sweeper',
        email:           'integration-test-sweeper@artixhub.internal',
        username:        'integration-test-sweeper',
        name:            'Integration Test Sweeper',
        profileComplete: false,
      },
    })
    userId = user.id

    const article = await prisma.article.create({
      data: {
        title:            'Integration test — sweeper no-double-index',
        content:          'Content for sweeper integration test',
        category:         'Test',
        status:           'published',
        authorId:         userId,
        contentUpdatedAt: new Date(),
      },
    })
    articleId = article.id
  })

  afterAll(async () => {
    await prisma.article.deleteMany({ where: { authorId: userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  afterEach(() => vi.restoreAllMocks())

  it('handleIndex sets indexedAt to a non-null value', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await handleIndex({ entity: 'article', id: articleId })

    const row = await prisma.article.findUnique({
      where:  { id: articleId },
      select: { indexedAt: true, contentUpdatedAt: true },
    })

    expect(row.indexedAt).not.toBeNull()
    // contentUpdatedAt was NOT touched by handleIndex — confirming the two columns are independent
    expect(row.contentUpdatedAt).not.toBeNull()
  })

  it('after successful index, sweepIndex does NOT re-enqueue the same article', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await handleIndex({ entity: 'article', id: articleId })

    enqueueSpy.mockClear()
    // $queryRawUnsafe is NOT mocked — it runs against the real test DB
    await sweepIndex()

    const wasReEnqueued = enqueueSpy.mock.calls.some(
      c => c[0] === 'ai:index' && c[1].id === articleId
    )
    expect(wasReEnqueued).toBe(false)
  })

  it('after content changes, sweepIndex re-enqueues for re-indexing', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    await handleIndex({ entity: 'article', id: articleId })

    // Simulate content change: bump contentUpdatedAt to after indexedAt
    await new Promise(r => setTimeout(r, 10))
    await prisma.article.update({
      where: { id: articleId },
      data:  { contentUpdatedAt: new Date() },
    })

    enqueueSpy.mockClear()
    await sweepIndex()

    const wasReEnqueued = enqueueSpy.mock.calls.some(
      c => c[0] === 'ai:index' && c[1].id === articleId
    )
    expect(wasReEnqueued).toBe(true)
  })
})

// ─── User profile: no double-index ────────────────────────────────────────────

describe.skipIf(SKIP)('sweepIndex integration — no double-index after handleIndex (user profile)', () => {
  let userId

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where:  { email: 'integration-test-sweeper-profile@artixhub.internal' },
      update: { profileComplete: true, banned: false, contentUpdatedAt: new Date() },
      create: {
        provider:        'system',
        providerId:      'integration-test-sweeper-profile',
        email:           'integration-test-sweeper-profile@artixhub.internal',
        username:        'integration-test-sweeper-profile',
        name:            'Integration Test Profile',
        bio:             'Bio for sweeper test',
        occupation:      'Tester',
        interests:       ['testing'],
        profileComplete: true,
        banned:          false,
        contentUpdatedAt: new Date(),
      },
    })
    userId = user.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  afterEach(() => vi.restoreAllMocks())

  it('handleIndex sets indexedAt on user profile', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await handleIndex({ entity: 'user', id: userId })

    const row = await prisma.user.findUnique({
      where:  { id: userId },
      select: { indexedAt: true, contentUpdatedAt: true },
    })

    expect(row.indexedAt).not.toBeNull()
    expect(row.contentUpdatedAt).not.toBeNull()
  })

  it('after successful index, sweepIndex does NOT re-enqueue the same user', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await handleIndex({ entity: 'user', id: userId })

    enqueueSpy.mockClear()
    await sweepIndex()

    const wasReEnqueued = enqueueSpy.mock.calls.some(
      c => c[0] === 'ai:index' && c[1].id === userId
    )
    expect(wasReEnqueued).toBe(false)
  })

  it('after profile content changes, sweepIndex re-enqueues user for re-indexing', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    await handleIndex({ entity: 'user', id: userId })

    // Simulate bio change: bump contentUpdatedAt to after indexedAt
    await new Promise(r => setTimeout(r, 10))
    await prisma.user.update({
      where: { id: userId },
      data:  { contentUpdatedAt: new Date() },
    })

    enqueueSpy.mockClear()
    await sweepIndex()

    const wasReEnqueued = enqueueSpy.mock.calls.some(
      c => c[0] === 'ai:index' && c[1].id === userId
    )
    expect(wasReEnqueued).toBe(true)
  })
})
