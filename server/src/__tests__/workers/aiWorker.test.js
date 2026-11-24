const prisma          = require('../../prismaClient')
const aiCore          = require('../../lib/aiCoreClient')
const jobQueue        = require('../../integrations/queue/jobQueue')
const { handleModerate, handleIndex, handleDelete } = require('../../workers/aiWorker')

// ─── Shared mocks ────────────────────────────────────────────────────────────

const ARTICLE_RECORD = { id: 'a1', title: 'Title', content: 'Body text', status: 'reviewing' }

function mockArticle(overrides = {}) {
  return vi.spyOn(prisma.article, 'findUnique').mockResolvedValue({ ...ARTICLE_RECORD, ...overrides })
}

function setup({ decision = 'approved', score = 0.9, reasons = [] } = {}) {
  vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
  vi.spyOn(aiCore, 'moderate').mockResolvedValue({ decision, score, reasons })
  vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  return {
    findSpy:   mockArticle(),
    updateSpy: vi.spyOn(prisma.article, 'update').mockResolvedValue({}),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ─── Reads from DB, not payload ───────────────────────────────────────────────

describe('handleModerate — reads content from DB', () => {
  it('fetches the record by id before calling ai-core', async () => {
    const { findSpy } = setup()
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(findSpy).toHaveBeenCalledWith({ where: { id: 'a1' } })
  })

  it('passes DB title and content to ai-core, not anything from job payload', async () => {
    setup()
    const moderateSpy = vi.spyOn(aiCore, 'moderate') // already mocked above, but assert call args
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(moderateSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Title',
      body:  'Body text',
    }))
  })

  it('uses description field for event entity', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'moderate').mockResolvedValue({ decision: 'approved', score: 0.9, reasons: [] })
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    vi.spyOn(prisma.event, 'findUnique').mockResolvedValue({
      id: 'e1', title: 'Event', description: 'Event body', status: 'reviewing',
    })
    const eventUpdate = vi.spyOn(prisma.event, 'update').mockResolvedValue({})
    await handleModerate({ entity: 'event', id: 'e1' })
    expect(vi.spyOn(aiCore, 'moderate').mock.calls[0]?.[0]?.body).toBe('Event body')
    // Confirm it still updated the DB
    expect(eventUpdate).toHaveBeenCalled()
  })
})

// ─── approved ────────────────────────────────────────────────────────────────

describe('handleModerate — approved', () => {
  it('sets status to published, writes score, clears moderationReason and moderationError', async () => {
    const { updateSpy } = setup({ decision: 'approved', score: 0.95 })
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: expect.objectContaining({
        status:          'published',
        moderationScore: 0.95,
        moderationReason: null,
        moderationError:  null,
      }),
    })
  })

  it('enqueues ai:index after publishing', async () => {
    setup({ decision: 'approved' })
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:index',
      expect.objectContaining({ entity: 'article', id: 'a1' })
    )
  })

  it('blogPost approved also sets archived:false', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'moderate').mockResolvedValue({ decision: 'approved', score: 0.9, reasons: [] })
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    vi.spyOn(prisma.blogPost, 'findUnique').mockResolvedValue({
      id: 'b1', title: 'T', content: 'C', status: 'reviewing',
    })
    const updateSpy = vi.spyOn(prisma.blogPost, 'update').mockResolvedValue({})
    await handleModerate({ entity: 'blogPost', id: 'b1' })
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ archived: false }),
    }))
  })

  it('event approved also sets archived:false', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'moderate').mockResolvedValue({ decision: 'approved', score: 0.9, reasons: [] })
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    vi.spyOn(prisma.event, 'findUnique').mockResolvedValue({
      id: 'e1', title: 'T', description: 'D', status: 'reviewing',
    })
    const updateSpy = vi.spyOn(prisma.event, 'update').mockResolvedValue({})
    await handleModerate({ entity: 'event', id: 'e1' })
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ archived: false }),
    }))
  })
})

// ─── needs_review ─────────────────────────────────────────────────────────────

describe('handleModerate — needs_review', () => {
  it('sets status to reviewing, does NOT enqueue ai:index', async () => {
    const { updateSpy } = setup({ decision: 'needs_review', score: 0.5 })
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'reviewing', moderationScore: 0.5 }),
    }))
    expect(enqueueSpy).not.toHaveBeenCalled()
  })
})

// ─── rejected ────────────────────────────────────────────────────────────────

describe('handleModerate — rejected', () => {
  it('sets status to rejected and joins reasons with semicolon', async () => {
    const { updateSpy } = setup({ decision: 'rejected', score: 0.1, reasons: ['hate speech', 'violence'] })
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status:          'rejected',
        moderationScore: 0.1,
        moderationReason: 'hate speech; violence',
      }),
    }))
  })

  it('rejected with empty reasons array → moderationReason is null', async () => {
    const { updateSpy } = setup({ decision: 'rejected', score: 0.1, reasons: [] })
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ moderationReason: null }),
    }))
  })

  it('does NOT enqueue ai:index on rejection', async () => {
    setup({ decision: 'rejected', score: 0.1, reasons: ['spam'] })
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(enqueueSpy).not.toHaveBeenCalled()
  })
})

// ─── record not found ────────────────────────────────────────────────────────

describe('handleModerate — record not found', () => {
  it('skips moderation entirely without touching the DB', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(null)
    const moderateSpy = vi.spyOn(aiCore, 'moderate').mockResolvedValue({})
    const updateSpy   = vi.spyOn(prisma.article, 'update').mockResolvedValue({})
    await handleModerate({ entity: 'article', id: 'missing' })
    expect(moderateSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })
})

// ─── ai-core not configured ───────────────────────────────────────────────────

describe('handleModerate — ai-core not configured', () => {
  it('returns without any DB reads or writes', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(false)
    const findSpy   = vi.spyOn(prisma.article, 'findUnique').mockResolvedValue({})
    const updateSpy = vi.spyOn(prisma.article, 'update').mockResolvedValue({})
    await handleModerate({ entity: 'article', id: 'a1' })
    expect(findSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })
})

// ─── retries ─────────────────────────────────────────────────────────────────

describe('handleModerate — retries', () => {
  it('schedules retry via setTimeout on ai-core failure (attempt 1)', async () => {
    vi.useFakeTimers()
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(ARTICLE_RECORD)
    vi.spyOn(aiCore, 'moderate').mockRejectedValue(new Error('timeout'))
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    await handleModerate({ entity: 'article', id: 'a1', attempt: 1 })

    expect(enqueueSpy).not.toHaveBeenCalled() // setTimeout not fired yet

    vi.runAllTimers()

    expect(enqueueSpy).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ entity: 'article', id: 'a1', attempt: 2 }),
      expect.objectContaining({ jobId: 'article:a1' })
    )
  })

  it('delay for attempt 2 is 2× the delay for attempt 1 (exponential backoff)', async () => {
    vi.useFakeTimers()
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(ARTICLE_RECORD)
    vi.spyOn(aiCore, 'moderate').mockRejectedValue(new Error('timeout'))
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})

    // attempt 1 → delay = 2000ms
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    await handleModerate({ entity: 'article', id: 'a1', attempt: 1 })
    const delay1 = setTimeoutSpy.mock.calls[0][1]

    setTimeoutSpy.mockReset()
    await handleModerate({ entity: 'article', id: 'a1', attempt: 2 })
    const delay2 = setTimeoutSpy.mock.calls[0][1]

    expect(delay2).toBe(delay1 * 2)
  })

  it('exhausted all retries → writes moderationError, does NOT enqueue retry', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(ARTICLE_RECORD)
    vi.spyOn(aiCore, 'moderate').mockRejectedValue(new Error('service down'))
    const enqueueSpy = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    const updateSpy  = vi.spyOn(prisma.article, 'update').mockResolvedValue({})

    await handleModerate({ entity: 'article', id: 'a1', attempt: 3 }) // MAX_RETRIES = 3

    expect(enqueueSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: expect.objectContaining({
        moderationError: expect.stringContaining('failed after 3 attempts'),
      }),
    })
  })

  it('exhausted retries does NOT touch moderationReason', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(ARTICLE_RECORD)
    vi.spyOn(aiCore, 'moderate').mockRejectedValue(new Error('service down'))
    vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
    const updateSpy = vi.spyOn(prisma.article, 'update').mockResolvedValue({})

    await handleModerate({ entity: 'article', id: 'a1', attempt: 3 })

    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationReason')
    expect(data).not.toHaveProperty('status')
  })
})

// ─── handleIndex ─────────────────────────────────────────────────────────────

describe('handleIndex', () => {
  function setupIndex() {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    return vi.spyOn(prisma.article, 'update').mockResolvedValue({})
  }

  it('sets indexedAt after a successful index call', async () => {
    const updateSpy = setupIndex()
    await handleIndex({ entity: 'article', id: 'a1', title: 'T', body: 'B' })
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data:  { indexedAt: expect.any(Date) },
    })
  })

  it('reads title and body from DB when they are not passed (sweeper path)', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(ARTICLE_RECORD)
    vi.spyOn(prisma.article, 'update').mockResolvedValue({})

    const indexSpy = vi.spyOn(aiCore, 'indexDocument')
    await handleIndex({ entity: 'article', id: 'a1' })

    expect(indexSpy).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('Title'),
    }))
  })

  it('skips without calling ai-core when record not found', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(prisma.article, 'findUnique').mockResolvedValue(null)
    const indexSpy = vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})

    await handleIndex({ entity: 'article', id: 'missing' })

    expect(indexSpy).not.toHaveBeenCalled()
  })

  it('does nothing when ai-core is not configured', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(false)
    const findSpy  = vi.spyOn(prisma.article, 'findUnique').mockResolvedValue({})
    const indexSpy = vi.spyOn(aiCore, 'indexDocument').mockResolvedValue({})

    await handleIndex({ entity: 'article', id: 'a1' })

    expect(findSpy).not.toHaveBeenCalled()
    expect(indexSpy).not.toHaveBeenCalled()
  })
})

// ─── handleDelete ─────────────────────────────────────────────────────────────

describe('handleDelete', () => {
  it('clears indexedAt after a successful delete call', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(true)
    vi.spyOn(aiCore, 'deleteDocument').mockResolvedValue({})
    const updateSpy = vi.spyOn(prisma.article, 'update').mockResolvedValue({})

    await handleDelete({ entity: 'article', id: 'a1' })

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data:  { indexedAt: null },
    })
  })

  it('does nothing when ai-core is not configured', async () => {
    vi.spyOn(aiCore, 'isConfigured').mockReturnValue(false)
    const deleteSpy = vi.spyOn(aiCore, 'deleteDocument').mockResolvedValue({})
    const updateSpy = vi.spyOn(prisma.article, 'update').mockResolvedValue({})

    await handleDelete({ entity: 'article', id: 'a1' })

    expect(deleteSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
