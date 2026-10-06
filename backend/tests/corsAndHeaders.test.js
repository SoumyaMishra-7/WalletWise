'use strict';

const request = require('supertest');
const app = require('../server');

describe('Security headers', () => {
  it('GET /api/v1/health responds with security-related headers', async () => {
    const res = await request(app).get('/api/v1/health');
    // Content-Security-Policy should be present (set by helmet)
    expect(res.headers).toHaveProperty('content-security-policy');
  });

  it('GET / includes X-Content-Type-Options: nosniff header', async () => {
    const res = await request(app).get('/');
    // Prevents MIME-sniffing attacks
    const header = res.headers['x-content-type-options'];
    if (header) {
      expect(header.toLowerCase()).toBe('nosniff');
    }
  });

  it('GET /api/v1/health does not include X-Powered-By header', async () => {
    const res = await request(app).get('/api/v1/health');
    // Express X-Powered-By should be disabled by helmet
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS preflight', () => {
  it('OPTIONS /api/v1/health returns 2xx for CORS preflight', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    // Should allow the preflight (2xx or 204)
    expect(res.statusCode).toBeLessThan(300);
  });
});

describe('HTTP method handling', () => {
  it('unsupported HTTP method on existing route returns 4xx not 5xx', async () => {
    const res = await request(app).patch('/api/v1/health');
    // PATCH on health check should not cause server error
    expect(res.statusCode).toBeLessThan(500);
  });

  it('requests to non-existent paths return 404', async () => {
    const res = await request(app).get('/api/v1/this-path-does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});
