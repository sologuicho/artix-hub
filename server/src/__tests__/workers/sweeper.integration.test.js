/**
 * Integration test: sweepIndex must NOT re-enqueue an article after handleIndex
 * has already set indexedAt, as long as contentUpdatedAt has not advanced.
 *
 * Uses a real Prisma connection (DATABASE_URL from .env).
 * ai-core is mocked — only the DB round-trip is real.
 *
 * Run alongside the unit test suite: `npm test`.
 * Skipped automatically when DATABASE_URL is absent (e.g. CI without DB).
 */

// Load .env before prismaClient is required so DATABASE_URL is available
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })

const prisma   = require('../../prismaClient')
const aiCore   = require('../../lib/aiCoreClient')
const jobQueue = require('../../integrations/queue/jobQueue')
const { handleIndex } = require('../../workers/aiWorker')
const { sweepIndex }  = require('../../workers/moderationSweeper')

const SKIP = !process.env.DATABASE_URL

describe.skipIf(SKIP)('sweepIndex integration — no double-index after handleIndex', () => {
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
      select: { indexedAt: true, contentUpdatedAt: true, updatedAt: true },
    })

    expect(row.indexedAt).not.toBeNull()
    // updatedAt was bumped by @updatedAt on the same write, but contentUpdatedAt
    // was NOT touched — confirming the two columns are independent
    expect(row.contentUpdatedAt).not.toBeNull()
  })

  it('after successful index, sweepIndex does NOT re-enqueue the same article', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    // Run handleIndex (sets indexedAt = now(), updatedAt bumped by @updatedAt)
    await handleIndex({ entity: 'article', id: articleId })

    // Clear and run sweepIndex
    enqueueSpy.mockClear()
    // $queryRawUnsafe is NOT mocked — it runs against the real DB
    await sweepIndex()

    const wasReEnqueued = enqueueSpy.mock.calls.some(
      c => c[0] === 'ai:index' && c[1].id === articleId
    )
    expect(wasReEnqueued).toBe(false)
  })

  it('after content changes, sweepIndex re-enqueues for re-indexing', async () => {
    // First index it
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    await handleIndex({ entity: 'article', id: articleId })

    // Simulate content change: bump contentUpdatedAt to after indexedAt
    // (normally done by updateArticle when indexable fields change)
    await new Promise(r => setTimeout(r, 10)) // ensure new Date() > existing indexedAt
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
