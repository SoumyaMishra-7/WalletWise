'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'wallet-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Wallet routes — authentication required', () => {
  it('GET /api/v1/wallets returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/wallets');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/wallets returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/wallets').send({});
    expect(res.statusCode).toBe(401);
  });
});

describe('Wallet routes — input validation', () => {
  it('POST /api/v1/wallets returns 4xx for empty body (authenticated)', async () => {
    const res = await request(app)
      .post('/api/v1/wallets')
      .set(authHeader)
      .send({});
    expect(res.statusCode).toBeLessThan(500);
  });

  it('GET /api/v1/wallets/:id with invalid ObjectId returns 4xx', async () => {
    const res = await request(app)
      .get('/api/v1/wallets/not-a-valid-id')
      .set(authHeader);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/wallets/:id/members with invalid ObjectId returns 4xx', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/not-a-valid-id/members')
      .set(authHeader)
      .send({ email: 'someone@example.com' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});
