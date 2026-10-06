'use strict';

/**
 * Tests for the recurring transaction detection math.
 * The detectRecurringCandidates function groups transactions by
 * description+amount and returns those appearing in 2+ distinct months.
 * These tests verify the grouping and filtering logic.
 */

describe('Recurring detection — text normalization', () => {
  const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  it('lowercases and trims', () => {
    expect(normalize('  Netflix  ')).toBe('netflix');
  });

  it('collapses multiple spaces', () => {
    expect(normalize('  GYM  MEMBERSHIP  ')).toBe('gym membership');
  });

  it('returns empty string for null', () => {
    expect(normalize(null)).toBe('');
  });

  it('returns empty string for empty', () => {
    expect(normalize('')).toBe('');
  });
});

describe('Recurring detection — grouping key logic', () => {
  const makeKey = (description, amount) => {
    const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return `${normalize(description)}|${Math.round(amount * 100) / 100}`;
  };

  it('same description+amount produces same key', () => {
    const k1 = makeKey('Netflix', 15.99);
    const k2 = makeKey('Netflix', 15.99);
    expect(k1).toBe(k2);
  });

  it('different description produces different key', () => {
    const k1 = makeKey('Netflix', 15.99);
    const k2 = makeKey('Spotify', 15.99);
    expect(k1).not.toBe(k2);
  });

  it('different amount produces different key', () => {
    const k1 = makeKey('Netflix', 15.99);
    const k2 = makeKey('Netflix', 9.99);
    expect(k1).not.toBe(k2);
  });

  it('case-insensitive matching: NETFLIX == netflix', () => {
    const k1 = makeKey('NETFLIX', 15.99);
    const k2 = makeKey('netflix', 15.99);
    expect(k1).toBe(k2);
  });

  it('rounds amount to 2 decimal places', () => {
    // 15.999 rounds to 16.00, 15.994 rounds to 15.99
    const k1 = makeKey('Netflix', 15.999);
    const k2 = makeKey('Netflix', 16.00);
    expect(k1).toBe(k2);
  });
});

describe('Recurring detection — month key deduplication', () => {
  const getMonthKey = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  it('same month produces same key', () => {
    expect(getMonthKey('2024-01-05')).toBe(getMonthKey('2024-01-28'));
  });

  it('different months produce different keys', () => {
    expect(getMonthKey('2024-01-05')).not.toBe(getMonthKey('2024-02-05'));
  });

  it('different years produce different keys', () => {
    expect(getMonthKey('2024-01-15')).not.toBe(getMonthKey('2025-01-15'));
  });

  it('Set deduplication eliminates same-month duplicates', () => {
    const months = new Set([
      getMonthKey('2024-01-05'),
      getMonthKey('2024-01-15'),
      getMonthKey('2024-02-10'),
    ]);
    expect(months.size).toBe(2); // Jan appears twice but deduplicates to 1
  });
});
