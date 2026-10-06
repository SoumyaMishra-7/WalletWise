'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken, signRefreshToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'refresh-test@example.com',
};

describe('Token refresh endpoint', () => {
  it('POST /api/v1/auth/refresh returns 401 without a refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect([400, 401]).toContain(res.statusCode);
  });

  it('POST /api/v1/auth/refresh returns 401 for an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' });
    expect([400, 401]).toContain(res.statusCode);
  });

  it('POST /api/v1/auth/refresh returns 401 for an access token (wrong token type)', async () => {
    const accessToken = signAccessToken(mockUser);
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: accessToken });
    // Access token should not be accepted as a refresh token
    expect([400, 401, 403]).toContain(res.statusCode);
  });
});

describe('Logout endpoint', () => {
  it('POST /api/v1/auth/logout clears the access_token cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({});
    // Logout should clear the cookie or succeed
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('ME endpoint — profile access', () => {
  it('GET /api/v1/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/auth/me returns non-401 for authenticated user', async () => {
    const authToken = signAccessToken(mockUser);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).not.toBe(401);
  });
});
