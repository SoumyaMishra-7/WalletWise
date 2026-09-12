const request = require('supertest');
const app = require('../server');

describe('Wallet Authorization & IDOR Security (#368)', () => {
    let tokenUser1;
    let tokenUser2;
    let walletId;

    beforeEach(async () => {
        const timestamp = Date.now();

        // Register User 1 (Wallet Owner)
        const user1Data = {
            studentId: `OWNER${timestamp}`,
            fullName: 'Owner User',
            email: `owner${timestamp}@example.com`,
            password: 'Password123!',
            department: 'Computer Science',
            year: '3rd'
        };
        const res1 = await request(app).post('/api/v1/auth/register').send(user1Data);
        tokenUser1 = res1.body.token;

        // Register User 2 (Attacker / Unrelated User)
        const user2Data = {
            studentId: `ATTACKER${timestamp}`,
            fullName: 'Attacker User',
            email: `attacker${timestamp}@example.com`,
            password: 'Password123!',
            department: 'Computer Science',
            year: '3rd'
        };
        const res2 = await request(app).post('/api/v1/auth/register').send(user2Data);
        tokenUser2 = res2.body.token;

        // User 1 creates a shared wallet
        const walletRes = await request(app)
            .post('/api/v1/wallets')
            .set('Authorization', `Bearer ${tokenUser1}`)
            .send({
                name: 'Private Budget Wallet',
                description: 'Confidential group budget'
            });

        expect(walletRes.statusCode).toBe(201);
        walletId = walletRes.body._id;

        // User 1 adds a transaction to the wallet
        const txRes = await request(app)
            .post('/api/v1/transactions')
            .set('Authorization', `Bearer ${tokenUser1}`)
            .send({
                type: 'expense',
                amount: 150,
                category: 'other',
                description: 'Secret Expense',
                walletId
            });

        expect(txRes.statusCode).toBe(201);
    });

    it('should return 403 Forbidden when a non-member tries to read wallet transactions via walletId (#368)', async () => {
        const res = await request(app)
            .get(`/api/v1/transactions?walletId=${walletId}`)
            .set('Authorization', `Bearer ${tokenUser2}`);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Access denied to this wallet');
    });

    it('should return 403 Forbidden when a non-member tries to post a transaction to another wallet', async () => {
        const res = await request(app)
            .post('/api/v1/transactions')
            .set('Authorization', `Bearer ${tokenUser2}`)
            .send({
                type: 'expense',
                amount: 50,
                category: 'food',
                description: 'Unauthorized Entry',
                walletId
            });

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('message', 'Access denied to this wallet');
    });

    it('should return 400 Bad Request when walletId format is invalid', async () => {
        const res = await request(app)
            .get('/api/v1/transactions?walletId=invalid-id-format')
            .set('Authorization', `Bearer ${tokenUser1}`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message', 'Invalid wallet ID format');
    });

    it('should allow legitimate wallet members to read transactions', async () => {
        const res = await request(app)
            .get(`/api/v1/transactions?walletId=${walletId}`)
            .set('Authorization', `Bearer ${tokenUser1}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.transactions.length).toBe(1);
        expect(res.body.transactions[0].description).toBe('Secret Expense');
    });
});
