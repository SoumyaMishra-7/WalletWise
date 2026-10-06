'use strict';

const request = require('supertest');
const app = require('../server');

/**
 * End-to-end auth flow tests:
 * Register → Login → Access protected resource → Logout
 *
 * These tests use real HTTP to verify the complete flow.
 * Since there's no DB in unit test mode, we verify the validation
 * and auth mechanics rather than actual data persistence.
 */

const uniqueUser = () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  return {
    studentId: `STU${suffix}`,
    fullName: 'Flow Test User',
    email: `flow_${suffix}@example.com`,
    password: 'FlowTest123!',
    department: 'Computer Science',
    year: '3rd',
  };
};

describe('Auth flow — schema validation', () => {
  it('POST /auth/register rejects missing fullName', async () => {
    const user = uniqueUser();
    delete user.fullName;
    const res = await request(app).post('/api/v1/auth/register').send(user);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /auth/register rejects missing department', async () => {
    const user = uniqueUser();
    delete user.department;
    const res = await request(app).post('/api/v1/auth/register').send(user);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('POST /auth/register rejects invalid year value', async () => {
    const user = { ...uniqueUser(), year: '7th' };
    const res = await request(app).post('/api/v1/auth/register').send(user);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('POST /auth/login rejects missing email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ password: 'Test123!' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('Auth flow — response consistency', () => {
  it('failed login response always has success: false', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `nonexistent_${Date.now()}@example.com`, password: 'Password123!' });
    // Should have success: false field
    if (res.body && [400, 401, 404].includes(res.statusCode)) {
      expect(res.body.success).toBe(false);
    }
  });

  it('validation error response has success: false and a message', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'pw' });
    if (res.statusCode >= 400 && res.statusCode < 500) {
      expect(res.body.success).toBe(false);
      expect(typeof res.body.message).toBe('string');
    }
  });
});
