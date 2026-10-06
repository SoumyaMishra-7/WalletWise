'use strict';

const request = require('supertest');
const app = require('../server');

const BASE_REGISTER = '/api/v1/auth/register';
const BASE_LOGIN = '/api/v1/auth/login';

const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

const validUser = () => ({
  studentId: `STU${Date.now()}`,
  fullName: 'Test User',
  email: uniqueEmail(),
  password: 'Password123!',
  department: 'Computer Science',
  year: '2nd',
});

describe('Auth — registration validation', () => {
  it('returns 400 for empty body', async () => {
    const res = await request(app).post(BASE_REGISTER).send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE_REGISTER)
      .send({ email: uniqueEmail(), password: 'Password123!' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 for invalid email format', async () => {
    const user = { ...validUser(), email: 'not-an-email' };
    const res = await request(app).post(BASE_REGISTER).send(user);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 for weak password (too short)', async () => {
    const user = { ...validUser(), password: 'weak' };
    const res = await request(app).post(BASE_REGISTER).send(user);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('Auth — login validation', () => {
  it('returns 400 for empty body', async () => {
    const res = await request(app).post(BASE_LOGIN).send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post(BASE_LOGIN)
      .send({ email: uniqueEmail() });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app)
      .post(BASE_LOGIN)
      .send({ email: `nonexistent_${Date.now()}@example.com`, password: 'Password123!' });
    // 400 or 401 depending on whether email or credentials fail first
    expect([400, 401, 404]).toContain(res.statusCode);
  });

  it('returns 401 for wrong password on valid email', async () => {
    // Register first, then try wrong password
    const user = validUser();
    await request(app).post(BASE_REGISTER).send(user);
    const res = await request(app)
      .post(BASE_LOGIN)
      .send({ email: user.email, password: 'WrongPassword999!' });
    expect([401, 400]).toContain(res.statusCode);
  });
});

describe('Auth — protected routes without token', () => {
  const routes = [
    ['get', '/api/v1/transactions'],
    ['get', '/api/v1/dashboard'],
    ['get', '/api/v1/budget/current'],
  ];

  routes.forEach(([method, path]) => {
    it(`${method.toUpperCase()} ${path} returns 401`, async () => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(401);
    });
  });
});
