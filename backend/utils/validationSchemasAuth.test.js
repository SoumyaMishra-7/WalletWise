const { userRegisterSchema, userLoginSchema, transactionSchema } = require('./validationSchemas');

describe('userRegisterSchema', () => {
  const valid = {
    studentId: 'STU001',
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'secure123',
  };

  it('accepts valid registration data', () => {
    expect(userRegisterSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty studentId', () => {
    expect(userRegisterSchema.safeParse({ ...valid, studentId: '' }).success).toBe(false);
  });

  it('rejects fullName shorter than 2 chars', () => {
    expect(userRegisterSchema.safeParse({ ...valid, fullName: 'J' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(userRegisterSchema.safeParse({ ...valid, email: 'notanemail' }).success).toBe(false);
  });

  it('rejects password shorter than 6 chars', () => {
    expect(userRegisterSchema.safeParse({ ...valid, password: '123' }).success).toBe(false);
  });
});

describe('userLoginSchema', () => {
  it('accepts valid email and password', () => {
    expect(userLoginSchema.safeParse({ email: 'test@example.com', password: 'pass123' }).success).toBe(true);
  });

  it('rejects empty password', () => {
    expect(userLoginSchema.safeParse({ email: 'test@example.com', password: '' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(userLoginSchema.safeParse({ email: 'invalid', password: 'pass123' }).success).toBe(false);
  });
});

describe('transactionSchema', () => {
  const valid = {
    type: 'expense',
    amount: 50.00,
    description: 'Lunch',
    category: 'food',
    date: new Date().toISOString(),
  };

  it('accepts valid expense transaction', () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts income type', () => {
    expect(transactionSchema.safeParse({ ...valid, type: 'income' }).success).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(transactionSchema.safeParse({ ...valid, type: 'transfer' }).success).toBe(false);
  });
});
