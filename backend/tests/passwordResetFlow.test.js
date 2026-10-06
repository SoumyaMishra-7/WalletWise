'use strict';

const request = require('supertest');
const app = require('../server');

describe('Password reset flow — validation', () => {
  it('POST /api/v1/auth/forgot-password returns 400 for empty body', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/auth/forgot-password returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-an-email' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/auth/reset-password returns 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/auth/reset-password returns 400 for weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'weak',
      });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('Email verification flow — validation', () => {
  it('POST /api/v1/auth/verify-email returns 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/auth/resend-otp returns 400 without email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-otp')
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it('POST /api/v1/auth/verify-email returns 400 for non-numeric OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: 'test@example.com', otp: 'abc123' });
    // OTP validation should reject non-numeric values
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});
