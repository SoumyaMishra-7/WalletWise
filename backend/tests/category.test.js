const request = require('supertest');
const app = require('../server');

describe('Custom categories', () => {
  let token;

  beforeEach(async () => {
    const userData = {
      studentId: 'CATSTU' + Date.now(),
      fullName: 'Category Test User',
      email: `categorytest${Date.now()}@example.com`,
      password: 'Password123!',
      department: 'Computer Science',
      year: '3rd'
    };
    const regRes = await request(app).post('/api/auth/register').send(userData);
    token = regRes.body.token;
  });

  it('creates, lists, rejects duplicates and built-in clashes', async () => {
    const create = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gym', type: 'expense', color: '#ff0000' });
    expect(create.statusCode).toBe(201);

    const dupe = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'gym' });
    expect(dupe.statusCode).toBe(409);

    const clash = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food' });
    expect(clash.statusCode).toBe(409);

    const list = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(list.statusCode).toBe(200);
    expect(list.body.builtIn).toContain('food');
    expect(list.body.custom.map((c) => c.name)).toContain('Gym');
  });

  it('accepts custom categories on transactions and rejects unknown ones', async () => {
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pets' });

    const ok = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 50, category: 'pets', description: 'vet' });
    expect(ok.statusCode).toBe(201);

    const bad = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 50, category: 'not-a-category' });
    expect(bad.statusCode).toBe(400);
  });

  it('blocks deleting a category that transactions use', async () => {
    const create = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hostel fees' });
    const id = create.body.category._id;

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 100, category: 'hostel fees' });

    const del = await request(app)
      .delete(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(409);
  });
});
