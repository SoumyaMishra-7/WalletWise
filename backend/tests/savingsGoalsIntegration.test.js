'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'savings-int-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Savings Goals routes — authentication required', () => {
  it('GET /api/v1/savings-goals returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/savings-goals');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/savings-goals returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/savings-goals').send({});
    expect(res.statusCode).toBe(401);
  });
});

describe('Savings Goals routes — input validation', () => {
  it('POST /api/v1/savings-goals returns 4xx for empty body', async () => {
    const res = await request(app)
      .post('/api/v1/savings-goals')
      .set(authHeader)
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/savings-goals returns 4xx for missing targetAmount', async () => {
    const res = await request(app)
      .post('/api/v1/savings-goals')
      .set(authHeader)
      .send({ name: 'Emergency Fund', targetDate: '2025-12-31' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/savings-goals/:id/add returns 4xx for invalid ObjectId', async () => {
    const res = await request(app)
      .post('/api/v1/savings-goals/invalid-id/add')
      .set(authHeader)
      .send({ amount: 100 });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/savings-goals/:id/add returns 4xx for missing amount', async () => {
    const res = await request(app)
      .post('/api/v1/savings-goals/6501234567890abc12345678/add')
      .set(authHeader)
      .send({});
    expect([400, 401, 404]).toContain(res.statusCode);
  });
});
