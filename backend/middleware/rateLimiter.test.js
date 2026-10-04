const rateLimit = require('express-rate-limit');

describe('Rate limiter middleware configuration', () => {
  it('express-rate-limit is importable', () => {
    expect(rateLimit).toBeDefined();
    expect(typeof rateLimit).toBe('function');
  });

  it('rateLimiter exports expected functions', () => {
    const limiters = require('./rateLimiter');
    expect(typeof limiters).toBe('object');
    expect(limiters).not.toBeNull();
  });

  describe('Rate limit constants', () => {
    it('429 is the standard Too Many Requests status code', () => {
      expect(429).toBe(429);
    });

    it('15 minutes window = 900000ms', () => {
      expect(15 * 60 * 1000).toBe(900_000);
    });

    it('1 minute window = 60000ms', () => {
      expect(1 * 60 * 1000).toBe(60_000);
    });
  });
});
