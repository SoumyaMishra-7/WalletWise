'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'insights-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Insights routes — authentication required', () => {
  it('GET /api/v1/insights returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/insights');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/insights/decision-helper returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/insights/decision-helper').send({});
    expect(res.statusCode).toBe(401);
  });
});

describe('Insights routes — validation', () => {
  it('POST /api/v1/insights/decision-helper with empty body returns 4xx', async () => {
    const res = await request(app)
      .post('/api/v1/insights/decision-helper')
      .set(authHeader)
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('GET /api/v1/insights returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/insights')
      .set(authHeader);
    // May return 500 if DB is needed, but not 401
    expect(res.statusCode).not.toBe(401);
  });
});

describe('Insights utilities — normalizeText', () => {
  const { normalizeText, daysBetween } = require('../services/insightsService');

  it('normalizeText removes special characters', () => {
    expect(normalizeText('Hello, World!')).toBe('hello world');
  });

  it('normalizeText returns empty for null', () => {
    expect(normalizeText(null)).toBe('');
  });

  it('daysBetween returns 0 for same day', () => {
    const d = new Date('2024-06-15');
    expect(daysBetween(d, d)).toBe(0);
  });

  it('daysBetween returns 30 for a month apart', () => {
    const a = new Date('2024-01-01');
    const b = new Date('2024-01-31');
    expect(daysBetween(a, b)).toBe(30);
  });
});
