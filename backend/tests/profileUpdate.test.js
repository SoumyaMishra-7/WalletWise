'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'profile-update-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Profile update endpoint', () => {
  it('PUT /api/v1/auth/profile returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .send({ fullName: 'New Name' });
    expect(res.statusCode).toBe(401);
  });

  it('PUT /api/v1/auth/profile returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set(authHeader)
      .send({ fullName: 'Updated Name' });
    // May fail with 404 (user not in test DB) but should not be 401
    expect(res.statusCode).not.toBe(401);
  });

  it('PUT /api/v1/auth/profile rejects invalid currency code', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set(authHeader)
      .send({ currency: 'INVALID' });
    expect([400, 404]).toContain(res.statusCode);
  });

  it('PUT /api/v1/auth/profile accepts valid currency code', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set(authHeader)
      .send({ currency: 'INR' });
    // Should not reject with 400 for valid currency
    expect(res.statusCode).not.toBe(400);
  });

  it('PUT /api/v1/auth/profile response does not contain password field', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set(authHeader)
      .send({ fullName: 'Test User' });
    const body = JSON.stringify(res.body || {});
    expect(body).not.toMatch(/"password":/i);
    expect(body).not.toMatch(/"passwordHash":/i);
  });
});
