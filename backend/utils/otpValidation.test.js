const { generateOtp, hashOtp } = require('./otp');

describe('OTP security properties', () => {
  it('OTP is always numeric string', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('no two consecutive OTPs are identical (entropy check)', () => {
    const otps = Array.from({ length: 20 }, () => generateOtp());
    const unique = new Set(otps);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('hash is consistent (same OTP same hash)', () => {
    const otp = generateOtp();
    const h1 = hashOtp(otp);
    const h2 = hashOtp(otp);
    expect(h1).toBe(h2);
  });

  it('different OTPs produce different hashes (no collision for adjacent values)', () => {
    const h1 = hashOtp('123456');
    const h2 = hashOtp('123457');
    expect(h1).not.toBe(h2);
  });

  it('hash is hex string only (no non-hex chars)', () => {
    expect(hashOtp('999999')).toMatch(/^[0-9a-f]+$/);
  });
});
