const { verifyEmailSchema, resendOtpSchema } = require('./validationSchemas');

describe('verifyEmailSchema', () => {
  const valid = { email: 'user@example.com', otp: '123456' };

  it('accepts valid email and 6-digit OTP', () => {
    expect(verifyEmailSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(verifyEmailSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
  });

  it('rejects 5-digit OTP', () => {
    expect(verifyEmailSchema.safeParse({ ...valid, otp: '12345' }).success).toBe(false);
  });

  it('rejects 7-digit OTP', () => {
    expect(verifyEmailSchema.safeParse({ ...valid, otp: '1234567' }).success).toBe(false);
  });

  it('rejects empty OTP', () => {
    expect(verifyEmailSchema.safeParse({ ...valid, otp: '' }).success).toBe(false);
  });
});

describe('resendOtpSchema', () => {
  it('accepts valid email', () => {
    expect(resendOtpSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(resendOtpSchema.safeParse({ email: 'notanemail' }).success).toBe(false);
  });

  it('rejects empty email', () => {
    expect(resendOtpSchema.safeParse({ email: '' }).success).toBe(false);
  });
});
