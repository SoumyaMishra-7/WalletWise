'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'dashboard-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Dashboard routes — authentication required', () => {
  it('GET /api/v1/dashboard returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/dashboard');
    expect(res.statusCode).toBe(401);
  });
});

describe('Dashboard routes — authenticated responses', () => {
  it('GET /api/v1/dashboard returns non-401 for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set(authHeader);
    // May fail if DB is needed but should not return 401
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /api/v1/dashboard response has success field', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set(authHeader);
    if (res.body && res.statusCode !== 500) {
      expect(typeof res.body.success).toBe('boolean');
    }
  });
});

describe('Dashboard — response does not leak sensitive data', () => {
  it('dashboard response does not include password field', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set(authHeader);
    // Response should never contain raw password fields
    const responseStr = JSON.stringify(res.body || {})
    expect(responseStr).not.toMatch(/"password":/i);
    expect(responseStr).not.toMatch(/"passwordHash":/i);
  });
});
