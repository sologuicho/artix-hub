const prisma    = require('../../prismaClient')
const jobQueue  = require('../../integrations/queue/jobQueue')
const { sweep, sweepModeration, sweepIndex, sweepDeindex } = require('../../workers/moderationSweeper')

afterEach(() => vi.restoreAllMocks())

function mockFindMany(entity, results = []) {
  return vi.spyOn(prisma[entity], 'findMany').mockResolvedValue(results)
}

function mockQueryRaw(results = []) {
  return vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue(results)
}

// ─── sweepModeration ──────────────────────────────────────────────────────────

describe('sweepModeration — queries', () => {
  it('queries each entity with status=reviewing, moderationScore=null, updatedAt<cutoff', async () => {
    const spies = {
      article:  mockFindMany('article'),
      research: mockFindMany('research'),
      blogPost: mockFindMany('blogPost'),
      event:    mockFindMany('event'),
    }
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepModeration()

    for (const spy of Object.values(spies)) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          status:          'reviewing',
          moderationScore: null,
          updatedAt:       expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }))
    }
  })

  it('includes OR clause to skip recently failed items', async () => {
    const spy = mockFindMany('article')
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepModeration()

    const where = spy.mock.calls[0][0].where
    expect(where).toHaveProperty('OR')
    expect(where.OR).toEqual(expect.arrayContaining([
      { moderationError: null },
      expect.objectContaining({ updatedAt: expect.objectContaining({ lte: expect.any(Date) }) }),
    ]))
  })

  it('cutoff date is approximately 10 minutes in the past', async () => {
    const spy = mockFindMany('article')
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const before = Date.now()
    await sweepModeration()
    const after = Date.now()

    const cutoff = spy.mock.calls[0][0].where.updatedAt.lt
    const ageMs  = Date.now() - cutoff.getTime()

    expect(ageMs).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000)
    expect(ageMs).toBeLessThanOrEqual(10 * 60 * 1000 + (after - before) + 1000)
  })

  it('recent-failure cutoff is approximately 30 minutes in the past', async () => {
    const spy = mockFindMany('article')
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepModeration()

    const orClause = spy.mock.calls[0][0].where.OR
    const failureCutoff = orClause.find(c => c.updatedAt)?.updatedAt?.lte
    expect(failureCutoff).toBeInstanceOf(Date)
    const ageMs = Date.now() - failureCutoff.getTime()
    expect(ageMs).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000)
    expect(ageMs).toBeLessThanOrEqual(30 * 60 * 1000 + 2000)
  })
})

describe('sweepModeration — enqueuing', () => {
  it('enqueues ai:moderate for each stuck item with correct jobId', async () => {
    mockFindMany('article',  [{ id: 'a1' }, { id: 'a2' }])
    mockFindMany('research', [{ id: 'r1' }])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepModeration()

    expect(enqueueSpy).toHaveBeenCalledTimes(3)
    expect(enqueueSpy).toHaveBeenCalledWith('ai:moderate', { entity: 'article',  id: 'a1' }, { jobId: 'article:a1' })
    expect(enqueueSpy).toHaveBeenCalledWith('ai:moderate', { entity: 'article',  id: 'a2' }, { jobId: 'article:a2' })
    expect(enqueueSpy).toHaveBeenCalledWith('ai:moderate', { entity: 'research', id: 'r1' }, { jobId: 'research:r1' })
  })

  it('enqueues nothing when no stuck items exist', async () => {
    mockFindMany('article',  [])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepModeration()

    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('returns total count of re-enqueued items', async () => {
    mockFindMany('article',  [{ id: 'a1' }])
    mockFindMany('research', [{ id: 'r1' }, { id: 'r2' }])
    mockFindMany('blogPost', [{ id: 'b1' }])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const count = await sweepModeration()
    expect(count).toBe(4)
  })

  it('continues scanning other entities when one throws', async () => {
    vi.spyOn(prisma.article, 'findMany').mockRejectedValue(new Error('DB error'))
    mockFindMany('research', [{ id: 'r1' }])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await expect(sweepModeration()).resolves.not.toThrow()
    expect(enqueueSpy).toHaveBeenCalledWith('ai:moderate', { entity: 'research', id: 'r1' }, { jobId: 'research:r1' })
  })
})

// ─── sweepIndex ───────────────────────────────────────────────────────────────

describe('sweepIndex — enqueuing', () => {
  it('enqueues ai:index for published items with indexedAt=null', async () => {
    mockFindMany('article',  [{ id: 'a1' }])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    mockQueryRaw([])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepIndex()

    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:index',
      { entity: 'article', id: 'a1' },
      { jobId: 'index:article:a1' }
    )
  })

  it('enqueues ai:index for stale items returned by raw query', async () => {
    mockFindMany('article',  [])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    mockQueryRaw([{ id: 'a-stale' }])  // first $queryRawUnsafe call returns stale article
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepIndex()

    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:index',
      expect.objectContaining({ id: 'a-stale' }),
      expect.objectContaining({ jobId: expect.stringContaining('index:') })
    )
  })

  it('deduplicates when same id appears in both unindexed and stale queries', async () => {
    mockFindMany('article',  [{ id: 'a1' }])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    // First $queryRawUnsafe call (article) returns the same id; rest return empty
    vi.spyOn(prisma, '$queryRawUnsafe')
      .mockResolvedValueOnce([{ id: 'a1' }])
      .mockResolvedValue([])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const count = await sweepIndex()

    // a1 should only be enqueued once despite appearing in both passes
    const a1Calls = enqueueSpy.mock.calls.filter(c => c[0] === 'ai:index' && c[1].id === 'a1')
    expect(a1Calls).toHaveLength(1)
    expect(count).toBe(1)
  })

  it('returns total count of items queued for indexing', async () => {
    mockFindMany('article',  [{ id: 'a1' }, { id: 'a2' }])
    mockFindMany('research', [{ id: 'r1' }])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    mockQueryRaw([])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const count = await sweepIndex()
    expect(count).toBe(3)
  })
})

// ─── sweepDeindex ─────────────────────────────────────────────────────────────

describe('sweepDeindex — enqueuing', () => {
  it('queries for non-published items with indexedAt set', async () => {
    const spy = mockFindMany('article')
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepDeindex()

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { not: 'published' }, indexedAt: { not: null } },
    }))
  })

  it('enqueues ai:delete with correct jobId', async () => {
    mockFindMany('article',  [{ id: 'a1' }])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweepDeindex()

    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:delete',
      { entity: 'article', id: 'a1' },
      { jobId: 'delete:article:a1' }
    )
  })

  it('returns total count of items queued for deindex', async () => {
    mockFindMany('article',  [{ id: 'a1' }])
    mockFindMany('research', [])
    mockFindMany('blogPost', [{ id: 'b1' }, { id: 'b2' }])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const count = await sweepDeindex()
    expect(count).toBe(3)
  })
})

// ─── sweep (full) ─────────────────────────────────────────────────────────────

describe('sweep — full run', () => {
  it('runs all three phases and returns { moderation, index, deindex }', async () => {
    // moderation: 2 stuck
    mockFindMany('article',  [{ id: 'a1' }, { id: 'a2' }])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    // index: nothing (all findMany already mocked above, raw returns empty)
    mockQueryRaw([])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const result = await sweep()

    expect(result).toHaveProperty('moderation', expect.any(Number))
    expect(result).toHaveProperty('index',      expect.any(Number))
    expect(result).toHaveProperty('deindex',    expect.any(Number))
  })
})
