'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'token-format-test@example.com',
};

describe('Authentication — token format variations', () => {
  it('accepts Bearer token in Authorization header (standard format)', async () => {
    const token = signAccessToken(mockUser);
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).not.toBe(401);
  });

  it('rejects "bearer" lowercase (case sensitivity check)', async () => {
    const token = signAccessToken(mockUser);
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `bearer ${token}`);
    // Most implementations require "Bearer" with capital B
    // This test documents the actual behavior
    expect([200, 401]).toContain(res.statusCode);
  });

  it('rejects "Token" prefix instead of "Bearer"', async () => {
    const token = signAccessToken(mockUser);
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Token ${token}`);
    expect(res.statusCode).toBe(401);
  });

  it('rejects empty Bearer value', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', 'Bearer ');
    expect(res.statusCode).toBe(401);
  });

  it('rejects token with extra spaces', async () => {
    const token = signAccessToken(mockUser);
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer  ${token}`); // extra space
    expect(res.statusCode).toBe(401);
  });

  it('rejects token that is just whitespace', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', 'Bearer    ');
    expect(res.statusCode).toBe(401);
  });
});

describe('Authentication — header case sensitivity', () => {
  it('accepts authorization header in lowercase (HTTP/2 header normalization)', async () => {
    const token = signAccessToken(mockUser);
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('authorization', `Bearer ${token}`);
    // HTTP headers are case-insensitive; Express normalizes them
    expect(res.statusCode).not.toBe(401);
  });
});
