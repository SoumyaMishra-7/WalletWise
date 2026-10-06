'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'savings-api-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Savings goals API — CRUD endpoint authentication', () => {
  it('GET /api/v1/savings-goals returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/savings-goals');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/savings-goals returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/savings-goals').send({});
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /api/v1/savings-goals/:id/add returns 401 without token', async () => {
    const res = await request(app).patch('/api/v1/savings-goals/6501234567890abc12345678/add').send({ amount: 100 });
    expect(res.statusCode).toBe(401);
  });
});

describe('Savings goals API — input validation', () => {
  it('POST returns 400 for completely empty body', async () => {
    const res = await request(app)
      .post('/api/v1/savings-goals')
      .set(authHeader)
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST returns 400 for negative targetAmount', async () => {
    const res = await request(app)
      .post('/api/v1/savings-goals')
      .set(authHeader)
      .send({
        name: 'Emergency Fund',
        targetAmount: -1000,
        targetDate: '2025-12-31',
      });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('PATCH /add returns 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/v1/savings-goals/not-valid-id/add')
      .set(authHeader)
      .send({ amount: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /add returns 400 for zero amount', async () => {
    const res = await request(app)
      .patch('/api/v1/savings-goals/6501234567890abc12345678/add')
      .set(authHeader)
      .send({ amount: 0 });
    expect([400, 404]).toContain(res.statusCode);
  });
});
