'use strict';

const { generateOtp, hashOtp, otpExpiresAt } = require('../utils/otp');

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const otp = generateOtp();
    expect(typeof otp).toBe('string');
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('returns values between 100000 and 999999 inclusive', () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateOtp();
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('does not consistently return the same value (randomness check)', () => {
    const otps = new Set(Array.from({ length: 20 }, () => generateOtp()));
    // With 20 random 6-digit codes the probability of a collision is negligible
    expect(otps.size).toBeGreaterThan(1);
  });
});

describe('hashOtp', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashOtp('123456');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for the same input', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });

  it('different OTPs that differ by one digit produce completely different hashes', () => {
    const h1 = hashOtp('100000');
    const h2 = hashOtp('100001');
    expect(h1).not.toBe(h2);
    // Avalanche property: hashes should differ by many characters
    const diffCount = [...h1].filter((c, i) => c !== h2[i]).length;
    expect(diffCount).toBeGreaterThan(10);
  });
});

describe('otpExpiresAt', () => {
  it('returns a Date object', () => {
    expect(otpExpiresAt() instanceof Date).toBe(true);
  });

  it('defaults to 10 minutes from now', () => {
    const before = Date.now();
    const expiry = otpExpiresAt();
    const after = Date.now();

    const expectedMs = 10 * 60 * 1000;
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + expectedMs);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + expectedMs);
  });

  it('respects a custom minutes argument', () => {
    const before = Date.now();
    const expiry = otpExpiresAt(5);
    const after = Date.now();

    const expectedMs = 5 * 60 * 1000;
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + expectedMs);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + expectedMs);
  });

  it('returns a future date (not in the past)', () => {
    expect(otpExpiresAt().getTime()).toBeGreaterThan(Date.now());
  });
});
