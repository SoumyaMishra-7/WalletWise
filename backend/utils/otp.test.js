const { generateOtp, hashOtp, otpExpiresAt } = require('./otp');

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const otp = generateOtp();
    expect(typeof otp).toBe('string');
    expect(otp).toHaveLength(6);
  });

  it('contains only digits', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('generates unique OTPs', () => {
    const otps = new Set(Array.from({ length: 10 }, () => generateOtp()));
    expect(otps.size).toBeGreaterThan(1);
  });

  it('value is between 100000 and 999999', () => {
    for (let i = 0; i < 10; i++) {
      const n = parseInt(generateOtp(), 10);
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });
});

describe('hashOtp', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    expect(hashOtp('123456')).toHaveLength(64);
    expect(hashOtp('123456')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
  });

  it('different OTPs produce different hashes', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });
});

describe('otpExpiresAt', () => {
  it('returns a Date object', () => {
    expect(otpExpiresAt()).toBeInstanceOf(Date);
  });

  it('defaults to 10 minutes from now', () => {
    const before = Date.now();
    const expires = otpExpiresAt();
    const diff = expires.getTime() - before;
    expect(diff).toBeGreaterThan(9 * 60 * 1000);
    expect(diff).toBeLessThan(11 * 60 * 1000);
  });

  it('custom minutes work correctly', () => {
    const before = Date.now();
    const expires = otpExpiresAt(30);
    const diff = expires.getTime() - before;
    expect(diff).toBeGreaterThan(29 * 60 * 1000);
    expect(diff).toBeLessThan(31 * 60 * 1000);
  });
});
