const request = require('supertest');
const app = require('../server');

describe('Regex Injection Security in Transaction Search', () => {
    let token;

    beforeEach(async () => {
        const timestamp = Date.now();

        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send({
                studentId: `REGEX${timestamp}`,
                fullName: 'Regex Test User',
                email: `regex${timestamp}@example.com`,
                password: 'Password123!',
                department: 'Computer Science',
                year: '3rd'
            });
        token = registerRes.body.token;

        // Seed a transaction so search has data to match against
        await request(app)
            .post('/api/v1/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'expense',
                amount: 100,
                category: 'food',
                description: 'Coffee and Snacks morning',
            });
    });

    it('should return 200 (not 500) when search contains invalid regex characters like "["', async () => {
        const res = await request(app)
            .get('/api/v1/transactions?search=[')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 200 when search contains "(" without crashing', async () => {
        const res = await request(app)
            .get('/api/v1/transactions?search=(')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 200 when search contains "*" without crashing', async () => {
        const res = await request(app)
            .get('/api/v1/transactions?search=*')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 200 with a potentially ReDoS-triggering pattern', async () => {
        const redosPattern = '(a+)+$';
        const res = await request(app)
            .get(`/api/v1/transactions?search=${encodeURIComponent(redosPattern)}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should still find transactions by literal text after sanitization', async () => {
        const res = await request(app)
            .get('/api/v1/transactions?search=Coffee')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.transactions.length).toBeGreaterThan(0);
        expect(res.body.transactions[0].description).toMatch(/coffee/i);
    });

    it('should treat "." as a literal dot and not match arbitrary characters', async () => {
        // "Coffee and Snacks morning" has no "." so should not appear
        const res = await request(app)
            .get('/api/v1/transactions?search=.')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        const hasCoffee = res.body.transactions.some(
            t => t.description === 'Coffee and Snacks morning'
        );
        expect(hasCoffee).toBe(false);
    });
});
