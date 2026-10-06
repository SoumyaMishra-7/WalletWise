'use strict';

const request = require('supertest');
const app = require('../server');

describe('Subscription routes — authentication required', () => {
  it('GET /api/v1/subscriptions returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/subscriptions');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/subscriptions returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/subscriptions').send({});
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/subscriptions/detect returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/subscriptions/detect');
    expect(res.statusCode).toBe(401);
  });
});

describe('Insights routes — authentication required', () => {
  it('GET /api/v1/insights returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/insights');
    expect(res.statusCode).toBe(401);
  });
});

describe('Vault routes — authentication required', () => {
  it('GET /api/v1/vault returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/vault');
    expect(res.statusCode).toBe(401);
  });
});

describe('Wallet routes — authentication required', () => {
  it('GET /api/v1/wallets returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/wallets');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/wallets returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/wallets').send({});
    expect(res.statusCode).toBe(401);
  });
});
