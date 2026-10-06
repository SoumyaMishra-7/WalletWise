const { forgotPasswordRequestSchema, forgotPasswordVerifySchema } = require('./validationSchemas');

describe('forgotPasswordRequestSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordRequestSchema.safeParse({ email: 'test@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(forgotPasswordRequestSchema.safeParse({ email: 'notanemail' }).success).toBe(false);
  });

  it('rejects empty email', () => {
    expect(forgotPasswordRequestSchema.safeParse({ email: '' }).success).toBe(false);
  });

  it('rejects missing email field', () => {
    expect(forgotPasswordRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('forgotPasswordVerifySchema', () => {
  const valid = { email: 'user@example.com', otp: '123456' };

  it('accepts valid email and 6-digit OTP', () => {
    expect(forgotPasswordVerifySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects OTP shorter than 6 digits', () => {
    expect(forgotPasswordVerifySchema.safeParse({ ...valid, otp: '12345' }).success).toBe(false);
  });

  it('rejects OTP longer than 6 digits', () => {
    expect(forgotPasswordVerifySchema.safeParse({ ...valid, otp: '1234567' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(forgotPasswordVerifySchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
  });
});
