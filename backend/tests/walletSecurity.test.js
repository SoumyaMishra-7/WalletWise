const request = require('supertest');
const app = require('../server');

describe('Wallet Authorization & IDOR Security (#368)', () => {
    let tokenUser1;
    let tokenUser2;
    let walletId;
    let transactionId;

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
        transactionId = txRes.body.transaction._id;
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

    it('should return 403 Forbidden when a non-member tries to inject a personal transaction into another wallet via PUT', async () => {
        // User 2 creates a personal transaction
        const personalTx = await request(app)
            .post('/api/v1/transactions')
            .set('Authorization', `Bearer ${tokenUser2}`)
            .send({
                type: 'expense',
                amount: 30,
                category: 'food',
                description: 'Personal Snack'
            });

        expect(personalTx.statusCode).toBe(201);
        const personalTxId = personalTx.body.transaction._id;

        // User 2 attempts to update their transaction with User 1's walletId
        const updateRes = await request(app)
            .put(`/api/v1/transactions/${personalTxId}`)
            .set('Authorization', `Bearer ${tokenUser2}`)
            .send({
                walletId
            });

        expect(updateRes.statusCode).toBe(403);
        expect(updateRes.body).toHaveProperty('message', 'Access denied to this wallet');
    });

    it('should return 400 Bad Request when attempting to change wallet assignment of an existing transaction', async () => {
        // User 1 creates a second wallet
        const secondWalletRes = await request(app)
            .post('/api/v1/wallets')
            .set('Authorization', `Bearer ${tokenUser1}`)
            .send({
                name: 'Second Wallet',
                description: 'Another budget'
            });
        expect(secondWalletRes.statusCode).toBe(201);
        const secondWalletId = secondWalletRes.body._id;

        // User 1 attempts to move transaction from first wallet to second wallet
        const updateRes = await request(app)
            .put(`/api/v1/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${tokenUser1}`)
            .send({
                walletId: secondWalletId
            });

        expect(updateRes.statusCode).toBe(400);
        expect(updateRes.body).toHaveProperty('message', 'Changing wallet assignment of an existing transaction is not allowed');
    });

    it('should allow legitimate wallet members to update their transaction within the wallet', async () => {
        const updateRes = await request(app)
            .put(`/api/v1/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${tokenUser1}`)
            .send({
                description: 'Updated Secret Expense',
                amount: 175,
                walletId
            });

        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.body.success).toBe(true);
        expect(updateRes.body.transaction.description).toBe('Updated Secret Expense');
        expect(updateRes.body.transaction.amount).toBe(175);
    });

    it('should allow legitimate wallet members to delete their transaction', async () => {
        const deleteRes = await request(app)
            .delete(`/api/v1/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${tokenUser1}`);

        expect(deleteRes.statusCode).toBe(200);
        expect(deleteRes.body.success).toBe(true);
    });
});
