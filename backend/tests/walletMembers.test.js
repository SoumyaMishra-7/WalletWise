'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'wallet-members-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };
const validId = '6501234567890abc12345678';
const invalidId = 'not-valid-id';

describe('Wallet member management — authentication', () => {
  it('POST /api/v1/wallets/:id/members returns 401 without token', async () => {
    const res = await request(app)
      .post(`/api/v1/wallets/${validId}/members`)
      .send({ email: 'member@example.com' });
    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/v1/wallets/:id/members/:userId returns 401 without token', async () => {
    const res = await request(app)
      .delete(`/api/v1/wallets/${validId}/members/${validId}`);
    expect(res.statusCode).toBe(401);
  });
});

describe('Wallet member management — ID validation', () => {
  it('POST /api/v1/wallets/:id/members returns 400 for invalid wallet ID', async () => {
    const res = await request(app)
      .post(`/api/v1/wallets/${invalidId}/members`)
      .set(authHeader)
      .send({ email: 'member@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/v1/wallets/:id/members/:userId returns 400 for invalid wallet ID', async () => {
    const res = await request(app)
      .delete(`/api/v1/wallets/${invalidId}/members/${validId}`)
      .set(authHeader);
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/v1/wallets/:id/members/:userId returns 400 for invalid user ID', async () => {
    const res = await request(app)
      .delete(`/api/v1/wallets/${validId}/members/${invalidId}`)
      .set(authHeader);
    expect(res.statusCode).toBe(400);
  });
});
