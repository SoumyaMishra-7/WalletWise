'use strict';

const { totalTrafficLimiter, globalLimiter, authLimiter, speedLimiter } = require('../middleware/rateLimiter');

describe('Rate limiter middleware exports', () => {
  it('totalTrafficLimiter is a function', () => {
    expect(typeof totalTrafficLimiter).toBe('function');
  });

  it('globalLimiter is a function', () => {
    expect(typeof globalLimiter).toBe('function');
  });

  it('authLimiter is a function', () => {
    expect(typeof authLimiter).toBe('function');
  });

  it('speedLimiter is a function', () => {
    expect(typeof speedLimiter).toBe('function');
  });
});

describe('Rate limiter responses', () => {
  const mockRes = () => {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    res.set = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    return res
  }

  it('authLimiter responds to a request without hanging', (done) => {
    const req = {
      ip: '127.0.0.1',
      headers: {},
      method: 'POST',
      path: '/login',
    }
    const res = mockRes()
    const next = () => done()
    expect(() => authLimiter(req, res, next)).not.toThrow()
  })
})
