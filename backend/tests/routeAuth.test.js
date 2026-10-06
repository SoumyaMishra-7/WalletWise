'use strict';

/**
 * Smoke tests that verify protected API routes require authentication.
 * These tests do NOT need a database — they only check that the middleware
 * returns 401 when no token is provided, which confirms each route is
 * behind the `protect` middleware.
 */

const request = require('supertest');
const app = require('../server');

const PROTECTED_ROUTES = [
  { method: 'get', path: '/api/v1/transactions' },
  { method: 'post', path: '/api/v1/transactions' },
  { method: 'get', path: '/api/v1/budget/current' },
  { method: 'post', path: '/api/v1/budget' },
  { method: 'get', path: '/api/v1/savings-goals' },
  { method: 'post', path: '/api/v1/savings-goals' },
  { method: 'get', path: '/api/v1/dashboard' },
  { method: 'get', path: '/api/v1/analytics/summary' },
  { method: 'get', path: '/api/v1/wallets' },
  { method: 'get', path: '/api/v1/gamification' },
];

describe('Protected route authentication', () => {
  PROTECTED_ROUTES.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} returns 401 without a token`, async () => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(401);
    });
  });
});

describe('Public routes', () => {
  it('GET /api/v1/health returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/v1/auth/register returns 400 for empty body (not 401)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    // Registration is public — no auth required, but empty body fails validation
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('POST /api/v1/auth/login returns 400 for empty body (not 401)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
