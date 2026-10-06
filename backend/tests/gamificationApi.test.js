'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');
const { BADGES, LEVELS, XP_AWARDS } = require('../utils/gamificationConstants');
const { calculateLevel, evaluateBadges } = require('../utils/gamificationEngine');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'gamification-api-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Gamification API — status endpoint', () => {
  it('GET /api/v1/gamification/status returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/gamification/status');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/gamification/status is accessible when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/gamification/status')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });
});

describe('Gamification constants cross-check', () => {
  it('LEVELS array has sequential levels starting at 1', () => {
    LEVELS.forEach((level, index) => {
      expect(level.level).toBe(index + 1);
    });
  });

  it('BADGES array has no duplicate ids', () => {
    const ids = BADGES.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('XP_AWARDS.TRANSACTION is consistent with calculateLevel boundary', () => {
    // 10 transactions × TRANSACTION XP = 100 XP = level 2
    const xp = XP_AWARDS.TRANSACTION * 10;
    const level = calculateLevel(xp);
    expect(level).toBe(2);
  });

  it('evaluateBadges returns array of strings (badge IDs)', () => {
    const user = { unlockedBadges: [], currentStreak: 0, totalXP: 0 };
    const result = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(Array.isArray(result)).toBe(true);
    result.forEach(id => expect(typeof id).toBe('string'));
  });
});

describe('Level system — progression consistency', () => {
  it('level increases or stays the same as XP increases', () => {
    let prev = calculateLevel(0);
    for (let xp = 50; xp <= 3000; xp += 50) {
      const curr = calculateLevel(xp);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('all levels have a title string', () => {
    LEVELS.forEach(l => {
      expect(typeof l.title).toBe('string');
      expect(l.title.length).toBeGreaterThan(0);
    });
  });
});
