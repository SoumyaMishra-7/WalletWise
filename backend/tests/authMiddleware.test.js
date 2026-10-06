'use strict';

const { protect } = require('../middleware/auth');
const { signAccessToken } = require('../utils/tokens');

// Minimal mock user
const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'test@example.com',
};

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.clearCookie = jest.fn()
  return res
}

const mockNext = jest.fn()

describe('protect middleware', () => {
  beforeEach(() => {
    mockNext.mockClear()
  })

  it('returns 401 when no token is provided', () => {
    const req = { headers: {}, cookies: {} }
    const res = mockRes()
    protect(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('accepts a token from the Authorization header', () => {
    const token = signAccessToken(mockUser)
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    }
    const res = mockRes()
    protect(req, res, mockNext)
    // next is called (via currencyMiddleware)
    expect(res.status).not.toHaveBeenCalledWith(401)
    expect(req.userId).toBe('6501234567890abc12345678')
    expect(req.userEmail).toBe('test@example.com')
  })

  it('accepts a token from the cookie', () => {
    const token = signAccessToken(mockUser)
    const req = {
      headers: {},
      cookies: { access_token: token },
    }
    const res = mockRes()
    protect(req, res, mockNext)
    expect(res.status).not.toHaveBeenCalledWith(401)
    expect(req.userId).toBe('6501234567890abc12345678')
  })

  it('returns 401 for an invalid token', () => {
    const req = {
      headers: { authorization: 'Bearer invalid.token.here' },
      cookies: {},
    }
    const res = mockRes()
    protect(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.message).toMatch(/invalid|expired/i)
  })

  it('returns 401 for a malformed Authorization header', () => {
    const req = {
      headers: { authorization: 'NotBearer sometoken' },
      cookies: {},
    }
    const res = mockRes()
    protect(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('sets req.userId to the token sub when valid', () => {
    const token = signAccessToken(mockUser)
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    }
    const res = mockRes()
    protect(req, res, mockNext)
    expect(req.userId).toBe('6501234567890abc12345678')
  })
})
