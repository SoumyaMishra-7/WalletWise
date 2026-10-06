'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'vault-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Vault routes — authentication required', () => {
  it('GET /api/v1/vault/status returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/vault/status');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/vault/enable returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/vault/enable').send({ password: 'test' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Vault routes — response shape', () => {
  it('GET /api/v1/vault/status returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/vault/status')
      .set(authHeader);
    // May return 404 if user not in test DB but should not be 401
    expect(res.statusCode).not.toBe(401);
    if (res.statusCode === 200) {
      expect(typeof res.body.vaultEnabled).toBe('boolean');
    }
  });
});

describe('Vault routes — privacy vault encryption constants', () => {
  it('vault routes are separate from transaction routes (no leakage)', async () => {
    // Verify vault routes don't accidentally accept transaction endpoints
    const res = await request(app)
      .get('/api/v1/vault/transactions')
      .set(authHeader);
    // Should not expose transaction data via vault route
    expect([404, 400]).toContain(res.statusCode);
  });
});
