const jwt = require('jsonwebtoken')
const prisma = require('../../prismaClient')
const { verifyAuthToken, AuthTokenErrorCodes } = require('../../core/auth/policy')

describe('verifyAuthToken — banned user', () => {
  let jwtSpy, findUniqueSpy

  beforeEach(() => {
    jwtSpy = vi.spyOn(jwt, 'verify')
    findUniqueSpy = vi.spyOn(prisma.user, 'findUnique')
  })

  afterEach(() => vi.restoreAllMocks())

  it('throws USER_BANNED when user.banned is true', async () => {
    jwtSpy.mockReturnValue({ id: 'u1' })
    findUniqueSpy.mockResolvedValue({ id: 'u1', banned: true, tokenVersion: 0 })

    await expect(verifyAuthToken('valid.jwt.token')).rejects.toMatchObject({
      code: AuthTokenErrorCodes.USER_BANNED,
    })
  })

  it('resolves when user is not banned', async () => {
    jwtSpy.mockReturnValue({ id: 'u1', tv: 0 })
    findUniqueSpy.mockResolvedValue({ id: 'u1', banned: false, tokenVersion: 0 })

    const result = await verifyAuthToken('valid.jwt.token')
    expect(result.user.id).toBe('u1')
  })

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    jwtSpy.mockReturnValue({ id: 'u1' })
    findUniqueSpy.mockResolvedValue(null)

    await expect(verifyAuthToken('valid.jwt.token')).rejects.toMatchObject({
      code: AuthTokenErrorCodes.USER_NOT_FOUND,
    })
  })

  it('throws SESSION_REVOKED when tokenVersion is higher than decoded.tv', async () => {
    jwtSpy.mockReturnValue({ id: 'u1', tv: 0 })
    findUniqueSpy.mockResolvedValue({ id: 'u1', banned: false, tokenVersion: 5 })

    await expect(verifyAuthToken('valid.jwt.token')).rejects.toMatchObject({
      code: AuthTokenErrorCodes.SESSION_REVOKED,
    })
  })

  it('throws JWT_INVALID when token is not a string', async () => {
    await expect(verifyAuthToken(null)).rejects.toMatchObject({
      code: AuthTokenErrorCodes.JWT_INVALID,
    })
  })
})
