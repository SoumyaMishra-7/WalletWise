const request = require('supertest');
const app = require('../server');

describe('Authentication Flow', () => {
    const testUser = {
        studentId: 'STU12345',
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        department: 'Computer Science',
        year: '3rd'
    };

    it('POST /api/auth/register should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        if (res.statusCode !== 201) {
            console.log('Registration failed body:', JSON.stringify(res.body, null, 2));
        }

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('token');
    });

    it('POST /api/auth/login should login the registered user', async () => {
        // Ensure user exists (registered in previous test or manually here)
        // Using a different email to avoid collision if run in isolation, 
        // but tests/setup.js clears DB before each test.
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        if (regRes.statusCode !== 201) {
            console.log('Login-prep registration failed body:', JSON.stringify(regRes.body, null, 2));
        }

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        if (res.statusCode !== 200) {
            console.log('Login failed body:', JSON.stringify(res.body, null, 2));
        }

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('token');
    });

    it('POST /api/auth/login with wrong password should fail', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('success', false);
    });
});
