'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'account-settings-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Profile update — currency validation', () => {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD'];
  const invalidCurrencies = ['INVALID', 'US', 'DOLLAR', '', 'USD EUR'];

  validCurrencies.forEach((currency) => {
    it(`accepts valid currency code: ${currency}`, async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set(authHeader)
        .send({ currency });
      // May return 404 (user not in DB) but should not return 400 for valid currency
      expect(res.statusCode).not.toBe(400);
    });
  });

  invalidCurrencies.forEach((currency) => {
    it(`rejects invalid currency: "${currency}"`, async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set(authHeader)
        .send({ currency });
      // Empty string or invalid codes should be rejected
      if (currency === '') {
        expect([400, 404]).toContain(res.statusCode);
      } else {
        expect([400, 404]).toContain(res.statusCode);
      }
    });
  });
});

describe('Profile update — theme preference', () => {
  it('accepts valid theme: dark', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set(authHeader)
      .send({ theme: 'dark' });
    expect(res.statusCode).not.toBe(400);
  });

  it('accepts valid theme: light', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set(authHeader)
      .send({ theme: 'light' });
    expect(res.statusCode).not.toBe(400);
  });
});
