const {
  validateArticle,
  validateEvent,
  validateBlogPost,
  validateComment,
} = require('../../middleware/validationMiddleware')

function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

// --- validateArticle ---
describe('validateArticle', () => {
  it('calls next() with valid fields', () => {
    const req = { body: { title: 'Título', content: 'Contenido', category: 'Tech' } }
    const res = mockRes()
    const next = vi.fn()

    validateArticle(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 400 when title is empty', () => {
    const req = { body: { title: '  ', content: 'Contenido', category: 'Tech' } }
    const res = mockRes()
    const next = vi.fn()

    validateArticle(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.ok).toBe(false)
    expect(body.errors).toContain('Title is required')
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 400 when content is missing', () => {
    const req = { body: { title: 'Título', category: 'Tech' } }
    const res = mockRes()
    const next = vi.fn()

    validateArticle(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].errors).toContain('Content is required')
  })

  it('accumulates multiple errors when all fields are missing', () => {
    const req = { body: {} }
    const res = mockRes()
    const next = vi.fn()

    validateArticle(req, res, next)

    const { errors } = res.json.mock.calls[0][0]
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })
})

// --- validateEvent ---
describe('validateEvent', () => {
  const valid = {
    title: 'Evento',
    description: 'Descripción',
    date: '2026-09-01',
    location: 'Online',
    type: 'webinar',
  }

  it('calls next() with valid fields', () => {
    const req = { body: valid }
    const res = mockRes()
    const next = vi.fn()

    validateEvent(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 400 when date is missing', () => {
    const req = { body: { ...valid, date: undefined } }
    const res = mockRes()
    const next = vi.fn()

    validateEvent(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].errors).toContain('Date is required')
  })

  it('returns 400 when title is whitespace', () => {
    const req = { body: { ...valid, title: '   ' } }
    const res = mockRes()
    const next = vi.fn()

    validateEvent(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].errors).toContain('Title is required')
  })
})

// --- validateBlogPost ---
describe('validateBlogPost', () => {
  it('calls next() with valid fields', () => {
    const req = { body: { title: 'Post', content: 'Contenido', category: 'News' } }
    const res = mockRes()
    const next = vi.fn()

    validateBlogPost(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 400 when category is missing', () => {
    const req = { body: { title: 'Post', content: 'Contenido' } }
    const res = mockRes()
    const next = vi.fn()

    validateBlogPost(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// --- validateComment ---
describe('validateComment', () => {
  it('calls next() with valid content and a target', () => {
    const req = { body: { content: 'Comentario', articleId: 'art-1' } }
    const res = mockRes()
    const next = vi.fn()

    validateComment(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 400 when content is empty', () => {
    const req = { body: { content: '', articleId: 'art-1' } }
    const res = mockRes()
    const next = vi.fn()

    validateComment(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
