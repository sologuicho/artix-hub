/**
 * Security tests for research / blog / event controllers.
 *
 * Covers for each entity:
 *  - create with status:'published' → 400 (not persisted)
 *  - update with status:'published' → 400 (not persisted)
 *  - update with banned fields (moderationScore, authorId, moderationReason) → not in data
 *  - draft→reviewing → moderation enqueued
 *  - rejected→reviewing → moderationReason cleared + moderation enqueued
 *  - published + body change → status set to reviewing + moderation enqueued
 */

const prisma           = require('../../prismaClient')
const jobQueue         = require('../../integrations/queue/jobQueue')
const researchCtrl     = require('../../controllers/researchController')
const blogCtrl         = require('../../controllers/blogController')
const eventCtrl        = require('../../controllers/eventController')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockReq(body = {}, params = {}, user = {}) {
  return {
    params: { id: 'x1', ...params },
    body,
    user: { id: 'u1', role: 'user', username: 'testuser', ...user },
  }
}

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── Research ────────────────────────────────────────────────────────────────

describe('researchController — create status security', () => {
  let createSpy, enqueue

  beforeEach(() => {
    createSpy = vi.spyOn(prisma.research, 'create').mockResolvedValue({
      id: 'r1', title: 'T', content: 'C', status: 'reviewing', authorId: 'u1',
    })
    enqueue = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns 400 when client sends status:published', async () => {
    const req = mockReq({ title: 'T', content: 'C', status: 'published' })
    const res = mockRes()
    await researchCtrl.createResearch(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('defaults to reviewing and enqueues moderation', async () => {
    const req = mockReq({ title: 'T', content: 'C' })
    const res = mockRes()
    await researchCtrl.createResearch(req, res)
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'reviewing' }),
    }))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ jobId: 'research:r1' })
    )
  })

  it('allows status:draft and does NOT enqueue moderation', async () => {
    createSpy.mockResolvedValue({ id: 'r1', title: 'T', content: 'C', status: 'draft', authorId: 'u1' })
    const req = mockReq({ title: 'T', content: 'C', status: 'draft' })
    const res = mockRes()
    await researchCtrl.createResearch(req, res)
    expect(enqueue).not.toHaveBeenCalled()
  })
})

describe('researchController — update security', () => {
  const existing = { id: 'r1', authorId: 'u1', status: 'draft', title: 'Old', content: 'Old' }
  let findSpy, updateSpy, enqueue

  beforeEach(() => {
    findSpy   = vi.spyOn(prisma.research, 'findUnique').mockResolvedValue(existing)
    updateSpy = vi.spyOn(prisma.research, 'update').mockResolvedValue({ ...existing, title: 'New' })
    enqueue   = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns 400 when client sends status:published', async () => {
    const req = mockReq({ status: 'published' })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('does NOT write moderationScore from body to DB', async () => {
    const req = mockReq({ title: 'New', moderationScore: 0.99 })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationScore')
  })

  it('does NOT write authorId from body to DB', async () => {
    const req = mockReq({ title: 'New', authorId: 'attacker' })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('authorId')
  })

  it('does NOT write moderationReason from body to DB', async () => {
    const req = mockReq({ title: 'New', moderationReason: 'inject' })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationReason')
  })

  it('draft→reviewing enqueues moderation', async () => {
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing' })
    const req = mockReq({ status: 'reviewing' })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ jobId: 'research:r1' })
    )
  })

  it('rejected→reviewing clears moderationReason/moderationError and enqueues moderation', async () => {
    findSpy.mockResolvedValue({ ...existing, status: 'rejected', moderationReason: 'hate' })
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing', moderationReason: null })
    const req = mockReq({ status: 'reviewing' })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).toHaveProperty('moderationReason', null)
    expect(data).toHaveProperty('moderationError', null)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ jobId: 'research:r1' })
    )
  })

  it('published + body change sets status to reviewing and enqueues moderation', async () => {
    findSpy.mockResolvedValue({ ...existing, status: 'published' })
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing', content: 'New' })
    const req = mockReq({ content: 'New' })
    const res = mockRes()
    await researchCtrl.updateResearch(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).toHaveProperty('status', 'reviewing')
    await new Promise(resolve => setImmediate(resolve))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ jobId: 'research:r1' })
    )
  })
})

// ─── Blog ─────────────────────────────────────────────────────────────────────

describe('blogController — create status security', () => {
  let createSpy, enqueue

  beforeEach(() => {
    createSpy = vi.spyOn(prisma.blogPost, 'create').mockResolvedValue({
      id: 'b1', title: 'T', content: 'C', status: 'reviewing', authorId: 'u1',
    })
    enqueue = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns 400 when client sends status:published', async () => {
    const req = mockReq({ title: 'T', content: 'C', status: 'published' })
    const res = mockRes()
    await blogCtrl.createBlogPost(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('defaults to reviewing and enqueues moderation', async () => {
    const req = mockReq({ title: 'T', content: 'C' })
    const res = mockRes()
    await blogCtrl.createBlogPost(req, res)
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'reviewing' }),
    }))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'b1' }),
      expect.objectContaining({ jobId: 'blogPost:b1' })
    )
  })

  it('allows status:draft and does NOT enqueue moderation', async () => {
    createSpy.mockResolvedValue({ id: 'b1', title: 'T', content: 'C', status: 'draft', authorId: 'u1' })
    const req = mockReq({ title: 'T', content: 'C', status: 'draft' })
    const res = mockRes()
    await blogCtrl.createBlogPost(req, res)
    expect(enqueue).not.toHaveBeenCalled()
  })
})

describe('blogController — update security', () => {
  const existing = { id: 'b1', authorId: 'u1', status: 'draft', title: 'Old', content: 'Old' }
  let findSpy, updateSpy, enqueue

  beforeEach(() => {
    findSpy   = vi.spyOn(prisma.blogPost, 'findUnique').mockResolvedValue(existing)
    updateSpy = vi.spyOn(prisma.blogPost, 'update').mockResolvedValue({ ...existing })
    enqueue   = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns 400 when client sends status:published', async () => {
    const req = mockReq({ status: 'published' })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('does NOT write moderationScore from body to DB', async () => {
    const req = mockReq({ title: 'New', moderationScore: 0.99 })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationScore')
  })

  it('does NOT write authorId from body to DB', async () => {
    const req = mockReq({ title: 'New', authorId: 'attacker' })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('authorId')
  })

  it('does NOT write moderationReason from body to DB', async () => {
    const req = mockReq({ title: 'New', moderationReason: 'inject' })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationReason')
  })

  it('draft→reviewing enqueues moderation', async () => {
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing' })
    const req = mockReq({ status: 'reviewing' })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'b1' }),
      expect.objectContaining({ jobId: 'blogPost:b1' })
    )
  })

  it('rejected→reviewing clears moderationReason/moderationError and enqueues moderation', async () => {
    findSpy.mockResolvedValue({ ...existing, status: 'rejected', moderationReason: 'spam' })
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing', moderationReason: null })
    const req = mockReq({ status: 'reviewing' })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).toHaveProperty('moderationReason', null)
    expect(data).toHaveProperty('moderationError', null)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'b1' }),
      expect.objectContaining({ jobId: 'blogPost:b1' })
    )
  })

  it('published + body change sets status to reviewing and enqueues moderation', async () => {
    findSpy.mockResolvedValue({ ...existing, status: 'published' })
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing', content: 'New' })
    const req = mockReq({ content: 'New' })
    const res = mockRes()
    await blogCtrl.updateBlogPost(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).toHaveProperty('status', 'reviewing')
    await new Promise(resolve => setImmediate(resolve))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'b1' }),
      expect.objectContaining({ jobId: 'blogPost:b1' })
    )
  })
})

// ─── Event ────────────────────────────────────────────────────────────────────

describe('eventController — create status security', () => {
  let createSpy, enqueue

  beforeEach(() => {
    createSpy = vi.spyOn(prisma.event, 'create').mockResolvedValue({
      id: 'e1', title: 'T', description: 'D', status: 'reviewing', creatorId: 'u1',
    })
    enqueue = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns 400 when client sends status:published', async () => {
    const req = mockReq({ title: 'T', description: 'D', date: '2026-12-01', status: 'published' })
    const res = mockRes()
    await eventCtrl.createEvent(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('defaults to reviewing and enqueues moderation', async () => {
    const req = mockReq({ title: 'T', description: 'D', date: '2026-12-01' })
    const res = mockRes()
    await eventCtrl.createEvent(req, res)
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'reviewing' }),
    }))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ jobId: 'event:e1' })
    )
  })

  it('allows status:draft and does NOT enqueue moderation', async () => {
    createSpy.mockResolvedValue({ id: 'e1', title: 'T', description: 'D', status: 'draft', creatorId: 'u1' })
    const req = mockReq({ title: 'T', description: 'D', date: '2026-12-01', status: 'draft' })
    const res = mockRes()
    await eventCtrl.createEvent(req, res)
    expect(enqueue).not.toHaveBeenCalled()
  })
})

describe('eventController — update security', () => {
  const existing = { id: 'e1', creatorId: 'u1', status: 'draft', title: 'Old', description: 'Old' }
  let findSpy, updateSpy, enqueue

  beforeEach(() => {
    findSpy   = vi.spyOn(prisma.event, 'findUnique').mockResolvedValue(existing)
    updateSpy = vi.spyOn(prisma.event, 'update').mockResolvedValue({ ...existing })
    enqueue   = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns 400 when client sends status:published', async () => {
    const req = mockReq({ status: 'published' })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('does NOT write moderationScore from body to DB', async () => {
    const req = mockReq({ title: 'New', moderationScore: 0.99 })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationScore')
  })

  it('does NOT write authorId/creatorId from body to DB', async () => {
    const req = mockReq({ title: 'New', authorId: 'attacker', creatorId: 'attacker' })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('authorId')
    expect(data).not.toHaveProperty('creatorId')
  })

  it('does NOT write moderationReason from body to DB', async () => {
    const req = mockReq({ title: 'New', moderationReason: 'inject' })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).not.toHaveProperty('moderationReason')
  })

  it('draft→reviewing enqueues moderation', async () => {
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing' })
    const req = mockReq({ status: 'reviewing' })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ jobId: 'event:e1' })
    )
  })

  it('rejected→reviewing clears moderationReason/moderationError and enqueues moderation', async () => {
    findSpy.mockResolvedValue({ ...existing, status: 'rejected', moderationReason: 'violence' })
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing', moderationReason: null })
    const req = mockReq({ status: 'reviewing' })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).toHaveProperty('moderationReason', null)
    expect(data).toHaveProperty('moderationError', null)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ jobId: 'event:e1' })
    )
  })

  it('published + body change sets status to reviewing and enqueues moderation', async () => {
    findSpy.mockResolvedValue({ ...existing, status: 'published' })
    updateSpy.mockResolvedValue({ ...existing, status: 'reviewing', description: 'New' })
    const req = mockReq({ description: 'New' })
    const res = mockRes()
    await eventCtrl.updateEvent(req, res)
    const data = updateSpy.mock.calls[0][0].data
    expect(data).toHaveProperty('status', 'reviewing')
    await new Promise(resolve => setImmediate(resolve))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ jobId: 'event:e1' })
    )
  })
})

// ─── jobQueue deduplication ───────────────────────────────────────────────────

describe('jobQueue — deduplication', () => {
  const { register, enqueue } = require('../../integrations/queue/jobQueue')

  it('skips a second enqueue with the same jobId before execution', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    register('test:dedup', handler)

    enqueue('test:dedup', { v: 1 }, { jobId: 'test:x1' })
    enqueue('test:dedup', { v: 2 }, { jobId: 'test:x1' }) // duplicate — skipped

    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve)) // flush both ticks

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ v: 1 })
  })

  it('allows re-enqueue with the same jobId after first job runs', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    register('test:requeue', handler)

    enqueue('test:requeue', { v: 1 }, { jobId: 'test:y1' })
    await new Promise(resolve => setImmediate(resolve)) // first job runs

    enqueue('test:requeue', { v: 2 }, { jobId: 'test:y1' }) // allowed — slot freed
    await new Promise(resolve => setImmediate(resolve))

    expect(handler).toHaveBeenCalledTimes(2)
  })
})
