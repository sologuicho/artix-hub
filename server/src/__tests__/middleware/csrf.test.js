const { verifyCsrf } = require('../../middleware/csrfMiddleware')

function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('verifyCsrf', () => {
  it('calls next() when cookie and header match', () => {
    const req = { cookies: { csrf: 'abc123' }, get: () => 'abc123', body: {}, query: {} }
    const res = mockRes()
    const next = vi.fn()

    verifyCsrf(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 when csrf cookie is missing', () => {
    const req = { cookies: {}, get: () => 'abc123', body: {}, query: {} }
    const res = mockRes()
    const next = vi.fn()

    verifyCsrf(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'CSRF token missing' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when x-csrf-token header is missing', () => {
    const req = { cookies: { csrf: 'abc123' }, get: () => undefined, body: {}, query: {} }
    const res = mockRes()
    const next = vi.fn()

    verifyCsrf(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'CSRF token missing' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when cookie and header do not match', () => {
    const req = { cookies: { csrf: 'abc123' }, get: () => 'wrong-token', body: {}, query: {} }
    const res = mockRes()
    const next = vi.fn()

    verifyCsrf(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'CSRF token invalid' })
    expect(next).not.toHaveBeenCalled()
  })

  it('falls back to _csrf in body when header is absent', () => {
    const req = {
      cookies: { csrf: 'tok' },
      get: () => undefined,
      body: { _csrf: 'tok' },
      query: {},
    }
    const res = mockRes()
    const next = vi.fn()

    verifyCsrf(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
