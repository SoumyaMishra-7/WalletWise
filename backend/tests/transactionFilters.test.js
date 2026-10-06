'use strict';

const request = require('supertest');
const app = require('../server');
const { signAccessToken } = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'tx-filter-test@example.com',
};
const authToken = signAccessToken(mockUser);
const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Transaction filter query params — authenticated user', () => {
  const expectNot401 = async (query) => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader)
      .query(query);
    expect(res.statusCode).not.toBe(401);
    return res;
  };

  it('accepts type=expense filter', async () => {
    await expectNot401({ type: 'expense' });
  });

  it('accepts type=income filter', async () => {
    await expectNot401({ type: 'income' });
  });

  it('accepts type=all filter', async () => {
    await expectNot401({ type: 'all' });
  });

  it('accepts date range filters', async () => {
    await expectNot401({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
  });

  it('accepts sort=oldest', async () => {
    await expectNot401({ sort: 'oldest' });
  });

  it('accepts sort=amount-high', async () => {
    await expectNot401({ sort: 'amount-high' });
  });

  it('accepts sort=amount-low', async () => {
    await expectNot401({ sort: 'amount-low' });
  });

  it('accepts pagination params', async () => {
    await expectNot401({ page: 1, limit: 10 });
  });

  it('handles non-numeric page gracefully (no 500)', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader)
      .query({ page: 'abc', limit: 'xyz' });
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(500);
  });

  it('handles search query', async () => {
    await expectNot401({ search: 'coffee' });
  });

  it('handles search with regex-special characters safely (ReDoS prevention)', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader)
      .query({ search: '(a+)+', page: 1 });
    // Should not timeout or return 500 — escapeRegex prevents ReDoS
    expect(res.statusCode).not.toBe(500);
  });
});
