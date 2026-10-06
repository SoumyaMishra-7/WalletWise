'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'security-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

// Injection attempts that should always return 400, never 500 or data
const injectionIds = [
  '{"$gt":""}',         // MongoDB operator injection
  '1; DROP TABLE--',    // SQL injection pattern
  '../../../etc/passwd', // Path traversal
  '__proto__',          // Prototype pollution
  'null',
  '0',
  '   ',                // Whitespace
];

describe('NoSQL injection prevention — transaction routes', () => {
  injectionIds.forEach((id) => {
    it(`GET /api/v1/transactions/${id} returns 4xx (not 500)`, async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${encodeURIComponent(id)}`)
        .set(authHeader);
      // Should return a client error (4xx), never a server error (5xx)
      expect(res.statusCode).toBeLessThan(500);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});

describe('NoSQL injection prevention — subscription routes', () => {
  const injectIds = ['{"$gt":""}', '../../../etc', '__proto__'];

  injectIds.forEach((id) => {
    it(`DELETE /api/v1/subscriptions/${id} returns 4xx`, async () => {
      const res = await request(app)
        .delete(`/api/v1/subscriptions/${encodeURIComponent(id)}`)
        .set(authHeader);
      expect(res.statusCode).toBeLessThan(500);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
