const prisma    = require('../../prismaClient')
const jobQueue  = require('../../integrations/queue/jobQueue')
const { sweep } = require('../../workers/moderationSweeper')

afterEach(() => vi.restoreAllMocks())

function mockFindMany(entity, results = []) {
  return vi.spyOn(prisma[entity], 'findMany').mockResolvedValue(results)
}

describe('moderationSweeper — sweep', () => {
  it('queries each entity with status=reviewing, moderationScore=null, updatedAt<cutoff', async () => {
    const spies = {
      article:  mockFindMany('article'),
      research: mockFindMany('research'),
      blogPost: mockFindMany('blogPost'),
      event:    mockFindMany('event'),
    }
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweep()

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

  it('enqueues ai:moderate for each stuck item with correct jobId', async () => {
    mockFindMany('article',  [{ id: 'a1' }, { id: 'a2' }])
    mockFindMany('research', [{ id: 'r1' }])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweep()

    expect(enqueueSpy).toHaveBeenCalledTimes(3)
    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:moderate',
      { entity: 'article', id: 'a1' },
      { jobId: 'article:a1' }
    )
    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:moderate',
      { entity: 'article', id: 'a2' },
      { jobId: 'article:a2' }
    )
    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:moderate',
      { entity: 'research', id: 'r1' },
      { jobId: 'research:r1' }
    )
  })

  it('enqueues nothing when no stuck items exist', async () => {
    mockFindMany('article',  [])
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await sweep()

    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('returns total count of re-enqueued items', async () => {
    mockFindMany('article',  [{ id: 'a1' }])
    mockFindMany('research', [{ id: 'r1' }, { id: 'r2' }])
    mockFindMany('blogPost', [{ id: 'b1' }])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const total = await sweep()
    expect(total).toBe(4)
  })

  it('continues scanning other entities when one throws', async () => {
    vi.spyOn(prisma.article, 'findMany').mockRejectedValue(new Error('DB error'))
    mockFindMany('research', [{ id: 'r1' }])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    // Should not throw
    await expect(sweep()).resolves.not.toThrow()
    // research item still processed
    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:moderate',
      { entity: 'research', id: 'r1' },
      { jobId: 'research:r1' }
    )
  })

  it('cutoff date is approximately 10 minutes in the past', async () => {
    const spy = mockFindMany('article')
    mockFindMany('research', [])
    mockFindMany('blogPost', [])
    mockFindMany('event',    [])
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    const before = Date.now()
    await sweep()
    const after = Date.now()

    const cutoff = spy.mock.calls[0][0].where.updatedAt.lt
    const ageMs  = Date.now() - cutoff.getTime()

    // Allow 1s of test execution slack
    expect(ageMs).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000)
    expect(ageMs).toBeLessThanOrEqual(10 * 60 * 1000 + (after - before) + 1000)
  })
})
