'use strict';

const { normalizeText, daysBetween } = require('../services/insightsService');

describe('normalizeText', () => {
  it('lowercases the input', () => {
    expect(normalizeText('HELLO WORLD')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('removes non-alphanumeric characters (except spaces)', () => {
    expect(normalizeText('Hello, World!')).toBe('hello world');
    expect(normalizeText('coffee@$5.00')).toBe('coffee500');
  });

  it('collapses multiple spaces to one', () => {
    expect(normalizeText('hello   world')).toBe('hello world');
  });

  it('returns empty string for empty or null input', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });

  it('handles numeric input (converts to string first)', () => {
    expect(normalizeText(42)).toBe('42');
  });

  it('preserves alphanumeric content', () => {
    expect(normalizeText('Netflix 2024')).toBe('netflix 2024');
  });
});

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    const d = new Date('2024-01-01');
    expect(daysBetween(d, d)).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    const a = new Date('2024-01-01');
    const b = new Date('2024-01-02');
    expect(daysBetween(a, b)).toBe(1);
  });

  it('returns 7 for a week apart', () => {
    const a = new Date('2024-01-01');
    const b = new Date('2024-01-08');
    expect(daysBetween(a, b)).toBe(7);
  });

  it('returns a negative number when b is before a', () => {
    const a = new Date('2024-01-08');
    const b = new Date('2024-01-01');
    expect(daysBetween(a, b)).toBe(-7);
  });

  it('handles month boundaries correctly', () => {
    const a = new Date('2024-01-31');
    const b = new Date('2024-03-01');
    // Jan 31 to Mar 1 = 30 days (2024 is a leap year: Feb has 29 days)
    expect(daysBetween(a, b)).toBe(30);
  });

  it('rounds to the nearest integer', () => {
    // 1.5 days difference → rounds to 2 (or 1 depending on exact ms)
    const a = new Date('2024-01-01T00:00:00.000Z');
    const b = new Date('2024-01-02T12:00:00.000Z'); // 36 hours = 1.5 days
    expect(Number.isInteger(daysBetween(a, b))).toBe(true);
  });
});
