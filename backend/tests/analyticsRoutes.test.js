'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'analytics-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Analytics routes — authentication required', () => {
  const protectedRoutes = [
    ['get', '/api/v1/analytics/summary'],
    ['get', '/api/v1/analytics/forecast'],
    ['get', '/api/v1/analytics/financial-health'],
  ];

  protectedRoutes.forEach(([method, path]) => {
    it(`${method.toUpperCase()} ${path} returns 401 without token`, async () => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(401);
    });
  });
});

describe('Analytics routes — authenticated responses', () => {
  it('GET /api/v1/analytics/summary returns a response for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set(authHeader);
    // May fail with a DB error (no real DB in test) but should not return 401
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /api/v1/analytics/forecast returns a non-401 response', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/forecast')
      .set(authHeader);
    expect(res.statusCode).not.toBe(401);
  });
});
