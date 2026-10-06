'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

// Mock user for auth token
const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'sub-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Subscription routes — validation', () => {
  it('POST /api/v1/subscriptions returns 400 for empty body', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set(authHeader)
      .send({});
    // Should return 400 (missing required fields) not 500
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/subscriptions returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set(authHeader)
      .send({
        amount: 10,
        billingCycle: 'monthly',
        nextDueDate: '2025-01-01',
      });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/subscriptions returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set(authHeader)
      .send({
        name: 'Netflix',
        billingCycle: 'monthly',
        nextDueDate: '2025-01-01',
      });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/v1/subscriptions/:id returns 400 for invalid ID', async () => {
    const res = await request(app)
      .delete('/api/v1/subscriptions/not-a-valid-id')
      .set(authHeader);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/subscriptions returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/subscriptions');
    expect(res.statusCode).toBe(401);
  });
});
