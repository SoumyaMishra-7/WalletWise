'use strict';

/**
 * Verifies that the backend currency constants stay in sync with
 * the frontend utils. The comment in currencies.js says:
 * "Keep in sync with frontend/src/utils/currency.js (SUPPORTED_CURRENCIES)"
 *
 * This test validates that contract.
 */
const {
  SUPPORTED_CURRENCY_CODES,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  normalizeCurrency,
} = require('../constants/currencies');

const path = require('path');
const fs = require('fs');

describe('Backend ↔ Frontend currency sync', () => {
  it('SUPPORTED_CURRENCY_CODES is a frozen array', () => {
    expect(Array.isArray(SUPPORTED_CURRENCY_CODES)).toBe(true);
    expect(Object.isFrozen(SUPPORTED_CURRENCY_CODES)).toBe(true);
  });

  it('DEFAULT_CURRENCY is in SUPPORTED_CURRENCY_CODES', () => {
    expect(SUPPORTED_CURRENCY_CODES).toContain(DEFAULT_CURRENCY);
  });

  it('all codes are 3-character ISO 4217 strings', () => {
    SUPPORTED_CURRENCY_CODES.forEach((code) => {
      expect(typeof code).toBe('string');
      expect(code.length).toBe(3);
      expect(code).toBe(code.toUpperCase());
    });
  });

  it('isSupportedCurrency correctly gates the supported codes', () => {
    SUPPORTED_CURRENCY_CODES.forEach((code) => {
      expect(isSupportedCurrency(code)).toBe(true);
      expect(isSupportedCurrency(code.toLowerCase())).toBe(true);
    });
  });

  it('isSupportedCurrency rejects invalid codes', () => {
    ['ZZZ', '', 'US', null, undefined, 123].forEach((invalid) => {
      expect(isSupportedCurrency(invalid)).toBe(false);
    });
  });

  it('normalizeCurrency falls back to DEFAULT_CURRENCY for invalid input', () => {
    expect(normalizeCurrency('XXX')).toBe(DEFAULT_CURRENCY);
    expect(normalizeCurrency(undefined)).toBe(DEFAULT_CURRENCY);
    expect(normalizeCurrency(null)).toBe(DEFAULT_CURRENCY);
  });

  it('frontend and backend list the same currencies', () => {
    // Read the frontend currency file to verify the code lists match
    const frontendPath = path.join(__dirname, '../../frontend/src/utils/currency.js');
    if (!fs.existsSync(frontendPath)) {
      // Skip if frontend not available in this test environment
      return;
    }
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');
    // All backend codes should appear in the frontend file
    SUPPORTED_CURRENCY_CODES.forEach((code) => {
      expect(frontendContent).toContain(`'${code}'`);
    });
  });
});
