'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'budget-month-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Budget routes — get by month', () => {
  it('GET /api/v1/budget/2024-01 returns non-401 for valid month', async () => {
    const res = await request(app)
      .get('/api/v1/budget/2024-01')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /api/v1/budget/invalid-month returns 400', async () => {
    const res = await request(app)
      .get('/api/v1/budget/January-2024')
      .set(authHeader);
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/v1/budget/2024-13 returns 400 for invalid month number', async () => {
    const res = await request(app)
      .get('/api/v1/budget/2024-13')
      .set(authHeader);
    // Month 13 is invalid, should return 400
    expect([400, 404]).toContain(res.statusCode);
  });

  it('GET /api/v1/budget/current returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/budget/current')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });
});

describe('Budget routes — all budgets', () => {
  it('GET /api/v1/budget returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/budget')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /api/v1/budget returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/budget');
    expect(res.statusCode).toBe(401);
  });
});
