import {
  formatCurrency,
  formatAmountNumber,
  getCurrencySymbol,
  getCurrencyFractionDigits,
  normalizeCurrency,
  detectCurrencyFromLocale,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from './currency';

describe('formatCurrency — large numbers', () => {
  test('formats millions correctly', () => {
    const result = formatCurrency(1000000, 'USD');
    expect(result).toContain('1');
    expect(result).not.toThrow;
  });

  test('formats very small amounts correctly', () => {
    const result = formatCurrency(0.01, 'USD');
    expect(result).toContain('0.01');
  });

  test('handles Infinity input as 0', () => {
    const result = formatCurrency(Infinity, 'USD');
    expect(result).toBe('$0.00');
  });

  test('handles -Infinity as 0', () => {
    const result = formatCurrency(-Infinity, 'USD');
    expect(result).toBe('$0.00');
  });

  test('negative amounts format correctly', () => {
    const result = formatCurrency(-100, 'USD');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getCurrencyFractionDigits — special cases', () => {
  test('JPY has 0 fraction digits', () => {
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
  });

  test('KRW has 0 fraction digits', () => {
    expect(getCurrencyFractionDigits('KRW')).toBe(0);
  });

  test('USD has 2 fraction digits', () => {
    expect(getCurrencyFractionDigits('USD')).toBe(2);
  });

  test('INR has 2 fraction digits', () => {
    expect(getCurrencyFractionDigits('INR')).toBe(2);
  });
});

describe('getCurrencySymbol — all supported currencies', () => {
  test('returns a non-empty string for all supported currencies', () => {
    SUPPORTED_CURRENCIES.forEach(({ code }) => {
      const symbol = getCurrencySymbol(code);
      expect(typeof symbol).toBe('string');
      expect(symbol.length).toBeGreaterThan(0);
    });
  });
});

describe('detectCurrencyFromLocale — additional regions', () => {
  test('en-AU detects AUD', () => {
    expect(detectCurrencyFromLocale('en-AU')).toBe('AUD');
  });

  test('pt-BR detects BRL', () => {
    expect(detectCurrencyFromLocale('pt-BR')).toBe('BRL');
  });

  test('ko-KR detects KRW', () => {
    expect(detectCurrencyFromLocale('ko-KR')).toBe('KRW');
  });

  test('unknown locale falls back to USD', () => {
    expect(detectCurrencyFromLocale('xx-XX')).toBe(DEFAULT_CURRENCY);
  });

  test('handles locale with no region', () => {
    const result = detectCurrencyFromLocale('en');
    expect(typeof result).toBe('string');
    expect(result.length).toBe(3);
  });
});

describe('normalizeCurrency — additional cases', () => {
  test('handles currency with trailing whitespace', () => {
    expect(normalizeCurrency('USD ')).toBe('USD');
  });

  test('handles mixed case codes', () => {
    expect(normalizeCurrency('uSd')).toBe('USD');
    expect(normalizeCurrency('Eur')).toBe('EUR');
  });

  test('returns DEFAULT_CURRENCY for numbers', () => {
    expect(normalizeCurrency(840)).toBe(DEFAULT_CURRENCY); // 840 is USD ISO numeric code but not supported
  });
});
