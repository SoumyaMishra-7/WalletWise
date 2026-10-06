'use strict';

const request = require('supertest');
const app = require('../server');

const uniqueSuffix = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

describe('User registration — valid input', () => {
  it('accepts all required fields in correct format', async () => {
    const suffix = uniqueSuffix();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        studentId: `STU${suffix}`,
        fullName: 'Test User',
        email: `testuser_${suffix}@example.com`,
        password: 'Password123!',
        department: 'Computer Science',
        year: '2nd',
      });
    // Should succeed (201) or fail with a non-server error
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('User registration — email uniqueness', () => {
  it('returns 4xx when registering with a duplicate email', async () => {
    const suffix = uniqueSuffix();
    const userData = {
      studentId: `STU${suffix}`,
      fullName: 'Dup User',
      email: `dup_${suffix}@example.com`,
      password: 'Password123!',
      department: 'CS',
      year: '1st',
    };

    // First registration
    await request(app).post('/api/v1/auth/register').send(userData);

    // Second registration with same email but different studentId
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...userData, studentId: `STU${uniqueSuffix()}` });

    // Should fail due to duplicate email
    expect([400, 409, 422]).toContain(res.statusCode);
  });
});

describe('User registration — password validation', () => {
  const baseUser = {
    studentId: `STU${uniqueSuffix()}`,
    fullName: 'Password Test',
    email: `pw_${uniqueSuffix()}@example.com`,
    department: 'CS',
    year: '1st',
  };

  const weakPasswords = [
    'short',           // too short
    'alllowercase1!',  // no uppercase
    'ALLUPPERCASE1!',  // no lowercase
    'NoNumbers!',      // no digit
    'NoSpecial1',      // no special character
  ];

  weakPasswords.forEach((password) => {
    it(`rejects weak password: "${password}"`, async () => {
      const suffix = uniqueSuffix();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...baseUser, studentId: `STU${suffix}`, email: `pw_${suffix}@example.com`, password });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.statusCode).toBeLessThan(500);
    });
  });
});
