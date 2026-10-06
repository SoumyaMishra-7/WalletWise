'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'gamif-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Gamification routes — authentication required', () => {
  it('GET /api/v1/gamification/status returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/gamification/status');
    expect(res.statusCode).toBe(401);
  });
});

describe('Gamification routes — response shape', () => {
  it('GET /api/v1/gamification/status returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/gamification/status')
      .set(authHeader);
    // May return 404 (user not in DB) but not 401 (auth succeeded)
    expect(res.statusCode).not.toBe(401);
  });

  it('gamification status response always returns success field', async () => {
    const res = await request(app)
      .get('/api/v1/gamification/status')
      .set(authHeader);
    // Response body should always have success field
    if (res.body) {
      expect(typeof res.body.success).toBe('boolean');
    }
  });
});

describe('Gamification constants — level progression', () => {
  const { calculateLevel, getNextLevelXP } = require('../utils/gamification');

  it('level 1 at 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('level 2 at 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('getNextLevelXP(1) = 100', () => {
    expect(getNextLevelXP(1)).toBe(100);
  });

  it('levels are monotonically non-decreasing with XP', () => {
    let prevLevel = calculateLevel(0);
    for (let xp = 100; xp <= 5000; xp += 100) {
      const level = calculateLevel(xp);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});
