const request = require('supertest');
const app = require('../server');
const { prevMonthStr } = require('../controllers/budgetController');

describe('Budget rollover', () => {
  let token;

  const validCategories = (total) => ([
    { name: 'Food', amount: Math.round(total * 0.6), percentage: 60 },
    { name: 'Transport', amount: total - Math.round(total * 0.6), percentage: 40 }
  ]);

  beforeEach(async () => {
    const userData = {
      studentId: 'ROLLOVERSTU' + Date.now(),
      fullName: 'Rollover Test User',
      email: `rollovertest${Date.now()}@example.com`,
      password: 'Password123!',
      department: 'Computer Science',
      year: '3rd'
    };
    const regRes = await request(app).post('/api/auth/register').send(userData);
    token = regRes.body.token;
  });

  it('computes prev month across year boundary', () => {
    expect(prevMonthStr('2024-01')).toBe('2023-12');
    expect(prevMonthStr('2024-03')).toBe('2024-02');
  });

  it('carries leftover once and ignores overspend in positive mode', async () => {
    await request(app).post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({ totalBudget: 10000, categories: validCategories(10000), month: '2023-12' });

    await request(app).post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 6000, category: 'food', date: '2023-12-15' });

    await request(app).post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({ totalBudget: 10000, categories: validCategories(10000), month: '2024-01', rolloverEnabled: true, rolloverMode: 'positive' });

    const first = await request(app).post('/api/budget/apply-rollover')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: '2024-01' });
    expect(first.statusCode).toBe(200);
    expect(first.body.budget.rolloverAmount).toBe(4000);
    expect(first.body.budget.rolloverFrom).toBe('2023-12');

    const second = await request(app).post('/api/budget/apply-rollover')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: '2024-01' });
    expect(second.body.message).toMatch(/already applied/i);
  });

  it('deducts overspend only in both mode', async () => {
    await request(app).post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({ totalBudget: 5000, categories: validCategories(5000), month: '2023-12' });

    await request(app).post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 7000, category: 'food', date: '2023-12-15' });

    await request(app).post('/api/budget')
      .set('Authorization', `Bearer ${token}`)
      .send({ totalBudget: 8000, categories: validCategories(8000), month: '2024-01', rolloverEnabled: true, rolloverMode: 'both' });

    const res = await request(app).post('/api/budget/apply-rollover')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: '2024-01' });
    expect(res.body.budget.rolloverAmount).toBe(-2000);
  });
});
