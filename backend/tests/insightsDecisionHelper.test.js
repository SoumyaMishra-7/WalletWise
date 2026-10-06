'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'decision-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Decision helper endpoint — authentication', () => {
  it('POST /api/v1/insights/decision-helper returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/insights/decision-helper')
      .send({ itemName: 'Coffee', cost: 5 });
    expect(res.statusCode).toBe(401);
  });
});

describe('Decision helper — input validation', () => {
  it('returns 400 for zero cost', async () => {
    const res = await request(app)
      .post('/api/v1/insights/decision-helper')
      .set(authHeader)
      .send({ itemName: 'Coffee', cost: 0, category: 'food' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for negative cost', async () => {
    const res = await request(app)
      .post('/api/v1/insights/decision-helper')
      .set(authHeader)
      .send({ itemName: 'Coffee', cost: -5, category: 'food' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for non-numeric cost', async () => {
    const res = await request(app)
      .post('/api/v1/insights/decision-helper')
      .set(authHeader)
      .send({ itemName: 'Coffee', cost: 'expensive', category: 'food' });
    expect(res.statusCode).toBe(400);
  });

  it('returns non-401 for valid input', async () => {
    const res = await request(app)
      .post('/api/v1/insights/decision-helper')
      .set(authHeader)
      .send({ itemName: 'Coffee', cost: 5, category: 'food' });
    expect(res.statusCode).not.toBe(401);
  });
});
