const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

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

    it('persists notification preferences on the user record', async () => {
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        expect(regRes.statusCode).toBe(201);

        const res = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${regRes.body.token}`)
            .send({ billRemindersEnabled: false, reminderDaysBefore: 7 });

        expect(res.statusCode).toBe(200);

        // Read straight from the database. notificationPrefs used to be absent
        // from the schema, so mongoose dropped it on save and the worker always
        // fell back to its defaults.
        const saved = await User.findOne({ email: testUser.email });

        expect(saved).not.toBeNull();
        expect(saved.notificationPrefs).toBeDefined();
        expect(saved.notificationPrefs.billRemindersEnabled).toBe(false);
        expect(saved.notificationPrefs.reminderDaysBefore).toBe(7);
    });
});
