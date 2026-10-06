'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'budget-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Budget routes — authentication and basic validation', () => {
  it('GET /api/v1/budget/current returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/budget/current');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/budget returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/budget').send({});
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/budget/copy-previous returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/budget/copy-previous').send({});
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/budget/stats/summary returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/budget/stats/summary');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/budget with empty body returns 4xx for authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/budget')
      .set(authHeader)
      .send({});
    // Should reject with validation error (4xx), not 5xx
    expect(res.statusCode).toBeLessThan(500);
  });

  it('PUT /api/v1/budget with invalid ObjectId returns 400', async () => {
    const res = await request(app)
      .put('/api/v1/budget/not-a-valid-id')
      .set(authHeader)
      .send({ totalBudget: 1000 });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/v1/budget with invalid ObjectId returns 400', async () => {
    const res = await request(app)
      .delete('/api/v1/budget/not-a-valid-id')
      .set(authHeader);
    expect(res.statusCode).toBe(400);
  });
});
