'use strict';

/**
 * Tests specifically for the ReDoS prevention in transaction search.
 * These verify that regex-dangerous inputs don't cause:
 * 1. Server crashes (SyntaxError from unescaped regex)
 * 2. Server hangs (catastrophic backtracking)
 * 3. HTTP 500 responses
 */

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'search-safety@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

// Classic ReDoS attack patterns
const REDOS_PAYLOADS = [
  '(a+)+',              // catastrophic backtracking
  '([a-zA-Z]+)*',       // more catastrophic backtracking
  '(a|aa)+',            // exponential complexity
  '+++',                // invalid regex without escaping
  '***',                // another invalid regex
  '[[[',                // unclosed character class
  '(?:',                // incomplete non-capturing group
  '\\',                 // trailing backslash
  '))))',               // unmatched closing parens
  '{99999,99999}',      // extreme quantifier
];

describe('Transaction search — ReDoS prevention', () => {
  REDOS_PAYLOADS.forEach((payload) => {
    it(`handles dangerous regex: "${payload.slice(0, 20)}" without 5xx`, async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set(authHeader)
        .query({ search: payload });

      // Should return auth-passed response (not 401)
      expect(res.statusCode).not.toBe(401);
      // Most importantly: should NEVER be a server error
      expect(res.statusCode).toBeLessThan(500);
    });
  });
});

describe('Transaction search — special characters', () => {
  it('handles dollar sign in search (regex anchor character)', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader)
      .query({ search: 'price $5.99' });
    expect(res.statusCode).toBeLessThan(500);
  });

  it('handles SQL injection attempt in search', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader)
      .query({ search: "'; DROP TABLE transactions; --" });
    expect(res.statusCode).toBeLessThan(500);
  });
});
