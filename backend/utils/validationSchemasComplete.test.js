const { userLoginSchema, userRegisterSchema } = require('./validationSchemas');

describe('Complete auth schema coverage', () => {
  describe('userLoginSchema', () => {
    it('accepts standard login credentials', () => {
      const valid = { email: 'student@university.edu', password: 'p' };
      expect(userLoginSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects undefined email', () => {
      expect(userLoginSchema.safeParse({ password: 'p' }).success).toBe(false);
    });

    it('rejects undefined password', () => {
      expect(userLoginSchema.safeParse({ email: 'test@test.com' }).success).toBe(false);
    });

    it('rejects both undefined', () => {
      expect(userLoginSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('userRegisterSchema name edge cases', () => {
    const base = { email: 'test@example.com', password: 'Pass@123', studentId: 'STU001' };

    it('accepts name with apostrophe (e.g. O\'Brien)', () => {
      expect(userRegisterSchema.safeParse({ ...base, fullName: "O'Brien" }).success).toBe(true);
    });

    it('accepts name with hyphen (e.g. Mary-Jane)', () => {
      expect(userRegisterSchema.safeParse({ ...base, fullName: 'Mary-Jane' }).success).toBe(true);
    });

    it('accepts name at max length (100 chars)', () => {
      expect(userRegisterSchema.safeParse({ ...base, fullName: 'A'.repeat(100) }).success).toBe(true);
    });

    it('rejects name over 100 chars', () => {
      expect(userRegisterSchema.safeParse({ ...base, fullName: 'A'.repeat(101) }).success).toBe(false);
    });
  });
});
