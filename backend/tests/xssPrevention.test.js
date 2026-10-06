'use strict';

/**
 * Tests that verify XSS and injection prevention at the API boundary.
 * These tests send potentially dangerous payloads and verify that:
 * 1. They return 4xx errors (validation catches them)
 * 2. Or if accepted, the response does not reflect raw script tags
 */

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'xss-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '&#60;script&#62;',
];

describe('XSS prevention — transaction description field', () => {
  XSS_PAYLOADS.forEach((payload) => {
    it(`rejects or sanitizes XSS in description: "${payload.slice(0, 30)}..."`, async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set(authHeader)
        .send({
          type: 'expense',
          amount: 10,
          category: 'food',
          description: payload,
        });

      if (res.statusCode === 201) {
        // If accepted, response should not echo raw script tags
        const body = JSON.stringify(res.body);
        expect(body).not.toContain('<script>');
        expect(body).not.toContain('onerror=alert');
      } else {
        // Should be a client error, not a server error
        expect(res.statusCode).toBeGreaterThanOrEqual(400);
        expect(res.statusCode).toBeLessThan(500);
      }
    });
  });
});

describe('Content-Security-Policy header', () => {
  it('health endpoint includes CSP header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers).toHaveProperty('content-security-policy');
  });

  it('protected endpoint includes CSP header when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader);
    expect(res.headers).toHaveProperty('content-security-policy');
  });
});
