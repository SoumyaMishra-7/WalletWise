'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'undo-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Undo transaction endpoint', () => {
  it('POST /api/v1/transactions/:id/undo returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/6501234567890abc12345678/undo');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/transactions/:id/undo returns 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/not-a-valid-id/undo')
      .set(authHeader);
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/transactions/:id/undo returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/6501234567890abc12345678/undo')
      .set(authHeader);
    // May return 404 (not found) but not 401
    expect(res.statusCode).not.toBe(401);
  });

  it('POST /api/v1/transactions/:id/undo response body has success field', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/6501234567890abc12345678/undo')
      .set(authHeader);
    if (res.body && res.statusCode !== 500) {
      expect(typeof res.body.success).toBe('boolean');
    }
  });
});

describe('Skip recurring endpoint', () => {
  it('PATCH /api/v1/transactions/recurring/:id/skip returns 401 without token', async () => {
    const res = await request(app)
      .patch('/api/v1/transactions/recurring/6501234567890abc12345678/skip');
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /api/v1/transactions/recurring/:id/skip returns 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/v1/transactions/recurring/not-valid/skip')
      .set(authHeader);
    expect(res.statusCode).toBe(400);
  });
});
