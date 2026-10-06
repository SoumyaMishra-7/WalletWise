const { userUpdateSchema } = require('./validationSchemas');

describe('userUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(userUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid fullName', () => {
    expect(userUpdateSchema.safeParse({ fullName: 'John Doe' }).success).toBe(true);
  });

  it('rejects fullName shorter than 2 chars', () => {
    expect(userUpdateSchema.safeParse({ fullName: 'J' }).success).toBe(false);
  });

  it('accepts theme: dark', () => {
    expect(userUpdateSchema.safeParse({ theme: 'dark' }).success).toBe(true);
  });

  it('accepts theme: light', () => {
    expect(userUpdateSchema.safeParse({ theme: 'light' }).success).toBe(true);
  });

  it('rejects invalid theme value', () => {
    expect(userUpdateSchema.safeParse({ theme: 'system' }).success).toBe(false);
  });

  it('accepts optional department', () => {
    expect(userUpdateSchema.safeParse({ department: 'Computer Science' }).success).toBe(true);
  });
});
