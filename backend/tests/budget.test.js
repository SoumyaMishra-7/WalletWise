const request = require('supertest');
const app = require('../server');

describe('Budget category validation', () => {
    let token;

    const validCategories = [
        { name: 'Food', categoryType: 'food', amount: 6000, percentage: 60 },
        { name: 'Transport', categoryType: 'transport', amount: 4000, percentage: 40 }
    ];

    const updateBudget = (id, categories, extra = {}) =>
        request(app)
            .put(`/api/v1/budget/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ categories, ...extra });

    beforeEach(async () => {
        const userData = {
            studentId: 'BUDGETSTU' + Date.now(),
            fullName: 'Budget Test User',
            email: `budgettest${Date.now()}@example.com`,
            password: 'Password123!',
            department: 'Computer Science',
            year: '3rd'
        };

        const regRes = await request(app).post('/api/v1/auth/register').send(userData);
        token = regRes.body.token;
    });

    const createValidBudget = async () => {
        const res = await request(app)
            .post('/api/v1/budget')
            .set('Authorization', `Bearer ${token}`)
            .send({ totalBudget: 10000, categories: validCategories });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        return res.body.budget.id;
    };

    it('rejects a category with a missing percentage', async () => {
        const id = await createValidBudget();

        const res = await updateBudget(id, [
            { name: 'Food', amount: 6000 },
            { name: 'Transport', amount: 4000, percentage: 40 }
        ]);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('rejects a category with a missing amount', async () => {
        const id = await createValidBudget();

        const res = await updateBudget(id, [
            { name: 'Food', percentage: 60 },
            { name: 'Transport', amount: 4000, percentage: 40 }
        ]);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('rejects non-numeric amount and percentage values', async () => {
        const id = await createValidBudget();

        const badAmount = await updateBudget(id, [
            { name: 'Food', amount: 'sixty', percentage: 60 },
            { name: 'Transport', amount: 4000, percentage: 40 }
        ]);
        expect(badAmount.statusCode).toBe(400);

        const badPercentage = await updateBudget(id, [
            { name: 'Food', amount: 6000, percentage: 'Sixty' },
            { name: 'Transport', amount: 4000, percentage: 40 }
        ]);
        expect(badPercentage.statusCode).toBe(400);
    });

    it('rejects null and NaN style values instead of storing them', async () => {
        const id = await createValidBudget();

        const nullAmount = await updateBudget(id, [
            { name: 'Food', amount: null, percentage: 60 },
            { name: 'Transport', amount: 4000, percentage: 40 }
        ]);
        expect(nullAmount.statusCode).toBe(400);

        const nanString = await updateBudget(id, [
            { name: 'Food', amount: 6000, percentage: 'NaN' },
            { name: 'Transport', amount: 4000, percentage: 40 }
        ]);
        expect(nanString.statusCode).toBe(400);
    });

    it('rejects negative category values', async () => {
        const id = await createValidBudget();

        const res = await updateBudget(id, [
            { name: 'Food', amount: -1, percentage: 60 },
            { name: 'Transport', amount: 10001, percentage: 40 }
        ]);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('still accepts valid categories that total 100 percent', async () => {
        const id = await createValidBudget();

        const res = await updateBudget(id, validCategories, { totalBudget: 10000 });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.budget.categories[0].amount).toBe(6000);
    });
});
