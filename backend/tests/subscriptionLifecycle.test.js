'use strict';

/**
 * Integration-style tests for the subscription flow.
 * Tests authentication, validation, and HTTP method support.
 */

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'sub-lifecycle@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Subscription routes — HTTP method support', () => {
  it('GET, POST /api/v1/subscriptions are supported (non-405)', async () => {
    const get = await request(app).get('/api/v1/subscriptions').set(authHeader);
    const post = await request(app).post('/api/v1/subscriptions').set(authHeader).send({});
    // Should not return 405 Method Not Allowed
    expect(get.statusCode).not.toBe(405);
    expect(post.statusCode).not.toBe(405);
  });
});

describe('Subscription creation — field validation', () => {
  it('returns 400 when name is empty string', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set(authHeader)
      .send({ name: '', amount: 10, billingCycle: 'monthly', nextDueDate: '2025-01-01' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('returns 400 for non-numeric amount', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set(authHeader)
      .send({ name: 'Netflix', amount: 'not-a-number', billingCycle: 'monthly', nextDueDate: '2025-01-01' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set(authHeader)
      .send({ name: 'Netflix', amount: -10, billingCycle: 'monthly', nextDueDate: '2025-01-01' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('Subscription detection', () => {
  it('GET /api/v1/subscriptions/detect returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/detect')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });
});
