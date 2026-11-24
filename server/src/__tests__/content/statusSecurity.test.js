const { sanitizeCreateStatus, sanitizeUpdateStatus } = require('../../lib/contentStatus')
const articleRepository = require('../../repositories/articleRepository')
const jobQueue = require('../../integrations/queue/jobQueue')
const articleService = require('../../services/article/articleService')
const { triggerModerationAfterEdit } = require('../../middleware/moderationMiddleware')

describe('sanitizeCreateStatus', () => {
  it('defaults undefined to reviewing', () => {
    expect(sanitizeCreateStatus(undefined)).toBe('reviewing')
  })

  it('defaults null to reviewing', () => {
    expect(sanitizeCreateStatus(null)).toBe('reviewing')
  })

  it('defaults empty string to reviewing', () => {
    expect(sanitizeCreateStatus('')).toBe('reviewing')
  })

  it('passes through draft', () => {
    expect(sanitizeCreateStatus('draft')).toBe('draft')
  })

  it('passes through reviewing', () => {
    expect(sanitizeCreateStatus('reviewing')).toBe('reviewing')
  })

  it('throws 400 when client sends published', () => {
    expect(() => sanitizeCreateStatus('published')).toThrow()
    try {
      sanitizeCreateStatus('published')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
      expect(err.message).toMatch(/moderation system/)
    }
  })

  it('throws 400 when client sends rejected', () => {
    expect(() => sanitizeCreateStatus('rejected')).toThrow()
    try {
      sanitizeCreateStatus('rejected')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
    }
  })

  it('throws 400 when client sends archived', () => {
    expect(() => sanitizeCreateStatus('archived')).toThrow()
    try {
      sanitizeCreateStatus('archived')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
    }
  })

  it('throws 400 on unknown status value', () => {
    expect(() => sanitizeCreateStatus('superadmin')).toThrow()
    try {
      sanitizeCreateStatus('superadmin')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
      expect(err.message).toMatch(/Unknown status/)
    }
  })
})

describe('sanitizeUpdateStatus', () => {
  it('returns undefined when value is undefined (no change)', () => {
    expect(sanitizeUpdateStatus(undefined)).toBeUndefined()
  })

  it('returns undefined when value is null (no change)', () => {
    expect(sanitizeUpdateStatus(null)).toBeUndefined()
  })

  it('returns undefined when value is empty string', () => {
    expect(sanitizeUpdateStatus('')).toBeUndefined()
  })

  it('passes through draft', () => {
    expect(sanitizeUpdateStatus('draft')).toBe('draft')
  })

  it('passes through reviewing', () => {
    expect(sanitizeUpdateStatus('reviewing')).toBe('reviewing')
  })

  it('throws 400 when client tries to update to published', () => {
    expect(() => sanitizeUpdateStatus('published')).toThrow()
    try {
      sanitizeUpdateStatus('published')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
      expect(err.message).toMatch(/moderation system/)
    }
  })

  it('throws 400 when client tries to update to archived', () => {
    expect(() => sanitizeUpdateStatus('archived')).toThrow()
    try {
      sanitizeUpdateStatus('archived')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
    }
  })

  it('throws 400 when client tries to update to rejected', () => {
    expect(() => sanitizeUpdateStatus('rejected')).toThrow()
    try {
      sanitizeUpdateStatus('rejected')
    } catch (err) {
      expect(err.httpStatus).toBe(400)
      expect(err.code).toBe('INVALID_STATUS')
    }
  })
})

// ─────────────────────────────────────────────────────────────
// triggerModerationAfterEdit — behaviour proof
// ─────────────────────────────────────────────────────────────
describe('triggerModerationAfterEdit', () => {
  let enqueue

  beforeEach(() => {
    enqueue = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns {} and does NOT enqueue when content is a draft', () => {
    const patch = triggerModerationAfterEdit('article',
      { id: 'a1', status: 'draft', title: 'T', content: 'old' },
      { content: 'new' }
    )
    expect(patch).toEqual({})
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('returns {} and does NOT enqueue when published but nothing changed', () => {
    const patch = triggerModerationAfterEdit('article',
      { id: 'a1', status: 'published', title: 'T', content: 'C' },
      { tags: ['x'] }
    )
    expect(patch).toEqual({})
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('returns { status: reviewing, moderationScore: null } and enqueues when published content body changes', async () => {
    const patch = triggerModerationAfterEdit('article',
      { id: 'a1', status: 'published', title: 'T', content: 'old body' },
      { content: 'new body' }
    )
    expect(patch).toEqual({ status: 'reviewing', moderationScore: null })
    await new Promise(resolve => setImmediate(resolve))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'a1' }),
      expect.objectContaining({ jobId: 'article:a1' })
    )
  })

  it('returns { status: reviewing, moderationScore: null } and enqueues when published title changes', async () => {
    const patch = triggerModerationAfterEdit('research',
      { id: 'r1', status: 'published', title: 'Old', content: 'C' },
      { title: 'New' }
    )
    expect(patch).toEqual({ status: 'reviewing', moderationScore: null })
    await new Promise(resolve => setImmediate(resolve))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ jobId: 'research:r1' })
    )
  })
})

// ─────────────────────────────────────────────────────────────
// articleService — status and field security
// ─────────────────────────────────────────────────────────────
describe('articleService — create status security', () => {
  let repoCreate, enqueue

  beforeEach(() => {
    repoCreate = vi.spyOn(articleRepository, 'create').mockResolvedValue({
      id: 'a1', title: 'T', content: 'C', status: 'reviewing',
    })
    enqueue = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('throws INVALID_STATUS when client sends status:published', async () => {
    await expect(
      articleService.createArticle(
        { title: 'T', content: 'C', status: 'published' },
        { id: 'u1', role: 'user' }
      )
    ).rejects.toMatchObject({ code: 'INVALID_STATUS', httpStatus: 400 })
    expect(repoCreate).not.toHaveBeenCalled()
  })

  it('defaults missing status to reviewing and enqueues moderation', async () => {
    await articleService.createArticle(
      { title: 'T', content: 'C' },
      { id: 'u1', role: 'user' }
    )
    expect(repoCreate).toHaveBeenCalledWith(expect.objectContaining({ status: 'reviewing' }))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'a1' }),
      expect.objectContaining({ jobId: 'article:a1' })
    )
  })

  it('allows status:draft and does NOT enqueue moderation', async () => {
    repoCreate.mockResolvedValue({ id: 'a1', title: 'T', content: 'C', status: 'draft' })
    await articleService.createArticle(
      { title: 'T', content: 'C', status: 'draft' },
      { id: 'u1', role: 'user' }
    )
    expect(repoCreate).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
    expect(enqueue).not.toHaveBeenCalled()
  })
})

describe('articleService — update status and field security', () => {
  let repoFindById, repoUpdate, enqueue
  const existing = { id: 'a1', authorId: 'u1', status: 'draft', title: 'Old', content: 'Old body' }
  const user = { id: 'u1', role: 'user' }

  beforeEach(() => {
    repoFindById = vi.spyOn(articleRepository, 'findById').mockResolvedValue(existing)
    repoUpdate = vi.spyOn(articleRepository, 'update').mockResolvedValue({
      ...existing, title: 'New',
    })
    enqueue = vi.spyOn(jobQueue, 'enqueue').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('throws INVALID_STATUS when client sends status:published', async () => {
    await expect(
      articleService.updateArticle('a1', { status: 'published' }, user)
    ).rejects.toMatchObject({ code: 'INVALID_STATUS', httpStatus: 400 })
    expect(repoUpdate).not.toHaveBeenCalled()
  })

  it('does NOT write moderationScore from body to the DB', async () => {
    await articleService.updateArticle('a1', { title: 'New', moderationScore: 0.99 }, user)
    const data = repoUpdate.mock.calls[0][1]
    expect(data).not.toHaveProperty('moderationScore')
  })

  it('does NOT write authorId from body to the DB', async () => {
    await articleService.updateArticle('a1', { title: 'New', authorId: 'attacker' }, user)
    const data = repoUpdate.mock.calls[0][1]
    expect(data).not.toHaveProperty('authorId')
  })

  it('does NOT write moderationReason from body to the DB', async () => {
    await articleService.updateArticle('a1', { moderationReason: 'inject' }, user)
    const data = repoUpdate.mock.calls[0][1]
    expect(data).not.toHaveProperty('moderationReason')
  })

  it('draft→reviewing transition enqueues moderation', async () => {
    repoUpdate.mockResolvedValue({ id: 'a1', title: 'Old', content: 'Old body', status: 'reviewing' })
    await articleService.updateArticle('a1', { status: 'reviewing' }, user)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'a1' }),
      expect.objectContaining({ jobId: 'article:a1' })
    )
  })

  it('rejected→reviewing clears moderationReason and enqueues moderation', async () => {
    repoFindById.mockResolvedValue({ ...existing, status: 'rejected', moderationReason: 'hate speech' })
    repoUpdate.mockResolvedValue({ id: 'a1', status: 'reviewing', moderationReason: null })
    await articleService.updateArticle('a1', { status: 'reviewing' }, user)
    const data = repoUpdate.mock.calls[0][1]
    expect(data).toHaveProperty('moderationReason', null)
    expect(data).toHaveProperty('moderationError', null)
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'a1' }),
      expect.objectContaining({ jobId: 'article:a1' })
    )
  })

  it('published + body change sets status to reviewing and enqueues moderation', async () => {
    repoFindById.mockResolvedValue({ ...existing, status: 'published' })
    repoUpdate.mockResolvedValue({ id: 'a1', title: 'Old', content: 'New body', status: 'reviewing' })
    await articleService.updateArticle('a1', { content: 'New body' }, user)
    const data = repoUpdate.mock.calls[0][1]
    expect(data).toHaveProperty('status', 'reviewing')
    await new Promise(resolve => setImmediate(resolve))
    expect(enqueue).toHaveBeenCalledWith(
      'ai:moderate',
      expect.objectContaining({ id: 'a1' }),
      expect.objectContaining({ jobId: 'article:a1' })
    )
  })
})
