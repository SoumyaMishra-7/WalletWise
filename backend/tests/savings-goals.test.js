const request = require('supertest');
const app = require('../server');

describe('Savings Goals Protected Routes', () => {
    let token;

    beforeEach(async () => {
        // Register and login to get a token
        const userData = {
            studentId: 'GOALSTU' + Date.now(),
            fullName: 'Goal Test User',
            email: `goaltest${Date.now()}@example.com`,
            password: 'Password123!',
            department: 'Computer Science',
            year: '3rd'
        };
        const regRes = await request(app).post('/api/auth/register').send(userData);
        token = regRes.body.token;
    });

    it('POST /api/savings-goals should creating a savings goal (protected)', async () => {
        const goalData = {
            name: 'New Laptop',
            description: 'Save for a new gaming laptop',
            targetAmount: 50000,
            currentAmount: 5000,
            targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Other',
            priority: 'Medium',
            monthlyContribution: 7500,
            isActive: true
        };

        const res = await request(app)
            .post('/api/savings-goals')
            .set('Authorization', `Bearer ${token}`)
            .send(goalData);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.goal).toHaveProperty('name', 'New Laptop');
    });

    it('GET /api/savings-goals should list goals (protected)', async () => {
        const res = await request(app)
            .get('/api/savings-goals')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.goals)).toBe(true);
    });

    it('POST /api/savings-goals should fail without token', async () => {
        const res = await request(app)
            .post('/api/savings-goals')
            .send({});

        expect(res.statusCode).toBe(401);
    });
});
