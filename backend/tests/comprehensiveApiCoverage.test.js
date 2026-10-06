'use strict';

/**
 * Comprehensive API surface coverage test.
 * Verifies that all major API routes exist and return appropriate status codes
 * for both authenticated and unauthenticated requests.
 */

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'comprehensive-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

// All protected GET routes should return 401 without auth
const PROTECTED_GET_ROUTES = [
  '/api/v1/transactions',
  '/api/v1/budget',
  '/api/v1/budget/current',
  '/api/v1/savings-goals',
  '/api/v1/dashboard',
  '/api/v1/analytics/summary',
  '/api/v1/analytics/forecast',
  '/api/v1/wallets',
  '/api/v1/subscriptions',
  '/api/v1/gamification/status',
  '/api/v1/vault/status',
  '/api/v1/insights',
];

describe('Protected GET routes — 401 without token', () => {
  PROTECTED_GET_ROUTES.forEach((path) => {
    it(`GET ${path} → 401`, async () => {
      const res = await request(app).get(path);
      expect(res.statusCode).toBe(401);
    });
  });
});

describe('Protected GET routes — no 401 with valid token', () => {
  PROTECTED_GET_ROUTES.forEach((path) => {
    it(`GET ${path} → not 401 (authenticated)`, async () => {
      const res = await request(app).get(path).set(authHeader);
      expect(res.statusCode).not.toBe(401);
    });
  });
});

describe('Public routes — always accessible', () => {
  it('GET /api/v1/health → 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
  });

  it('GET / → 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });
});
