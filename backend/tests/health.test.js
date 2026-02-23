const request = require('supertest');
const app = require('../server');

describe('Health Check Endpoint', () => {
    it('GET /api/v1/health should return 200 and healthy status', async () => {
        const res = await request(app).get('/api/v1/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'v1 healthy');
    });

    it('GET / should return 200 and running message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'WalletWise Backend API is running');
    });

    it('GET /non-existent-route should return 404', async () => {
        const res = await request(app).get('/api/non-existent-route');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('success', false);
    });
});
