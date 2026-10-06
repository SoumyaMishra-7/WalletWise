'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'investment-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Investment routes — authentication required', () => {
  it('GET /api/v1/investments/market returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/investments/market');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/investments/portfolio returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/investments/portfolio');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/investments/buy returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/investments/buy')
      .send({ symbol: 'AAPL', quantity: 1 });
    expect(res.statusCode).toBe(401);
  });
});

describe('Investment routes — authenticated access', () => {
  it('GET /api/v1/investments/market returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/investments/market')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /api/v1/investments/portfolio returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/investments/portfolio')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });
});
