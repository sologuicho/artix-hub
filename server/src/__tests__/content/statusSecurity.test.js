const { sanitizeCreateStatus, sanitizeUpdateStatus } = require('../../lib/contentStatus')

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
