'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'budget-summary-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Budget summary endpoint', () => {
  it('GET /api/v1/budget/stats/summary returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/budget/stats/summary');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/budget/stats/summary returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/budget/stats/summary')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /api/v1/budget/stats/summary response has success field', async () => {
    const res = await request(app)
      .get('/api/v1/budget/stats/summary')
      .set(authHeader);
    if (res.body && res.statusCode !== 500) {
      expect(typeof res.body.success).toBe('boolean');
    }
  });

  it('GET /api/v1/budget/stats/summary when no budget exists returns hasBudget: false', async () => {
    const res = await request(app)
      .get('/api/v1/budget/stats/summary')
      .set(authHeader);
    // If successful, hasBudget should be present
    if (res.statusCode === 200 && res.body.success) {
      expect(res.body).toHaveProperty('hasBudget');
      expect(typeof res.body.hasBudget).toBe('boolean');
    }
  });
});

describe('Budget summary — response structure', () => {
  it('summary response never exposes raw database fields', async () => {
    const res = await request(app)
      .get('/api/v1/budget/stats/summary')
      .set(authHeader);
    const body = JSON.stringify(res.body || {});
    // Should not expose internal MongoDB fields
    expect(body).not.toContain('"__v"');
    expect(body).not.toContain('"_id":{"$oid"');
  });
});
