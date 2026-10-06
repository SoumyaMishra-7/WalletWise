'use strict';

const { escapeRegex } = require('../utils/helpers');

describe('escapeRegex', () => {
  it('escapes dot (.)', () => {
    const escaped = escapeRegex('.');
    expect(new RegExp(escaped).test('a')).toBe(false);
    expect(new RegExp(escaped).test('.')).toBe(true);
  });

  it('escapes asterisk (*)', () => {
    // Without escape, * would make the regex invalid; with escape it matches literally
    expect(() => new RegExp(escapeRegex('a*b'))).not.toThrow();
    expect(new RegExp(escapeRegex('a*b')).test('a*b')).toBe(true);
    expect(new RegExp(escapeRegex('a*b')).test('aaab')).toBe(false);
  });

  it('escapes plus (+)', () => {
    expect(() => new RegExp(escapeRegex('a+b'))).not.toThrow();
    expect(new RegExp(escapeRegex('a+b')).test('a+b')).toBe(true);
  });

  it('escapes question mark (?)', () => {
    expect(() => new RegExp(escapeRegex('a?b'))).not.toThrow();
    expect(new RegExp(escapeRegex('a?b')).test('a?b')).toBe(true);
  });

  it('escapes caret (^)', () => {
    const escaped = escapeRegex('^hello');
    expect(new RegExp(escaped).test('^hello')).toBe(true);
    expect(new RegExp(escaped).test('hello')).toBe(false);
  });

  it('escapes dollar sign ($)', () => {
    const escaped = escapeRegex('price$5');
    expect(new RegExp(escaped).test('price$5')).toBe(true);
  });

  it('escapes curly braces ({})', () => {
    expect(() => new RegExp(escapeRegex('{2}'))).not.toThrow();
    expect(new RegExp(escapeRegex('{2}')).test('{2}')).toBe(true);
  });

  it('escapes parentheses (())', () => {
    expect(() => new RegExp(escapeRegex('(a+)+'))).not.toThrow();
    // This is the classic ReDoS pattern — it should not hang
    expect(new RegExp(escapeRegex('(a+)+')).test('(a+)+')).toBe(true);
  });

  it('escapes pipe (|)', () => {
    expect(() => new RegExp(escapeRegex('a|b'))).not.toThrow();
    expect(new RegExp(escapeRegex('a|b')).test('a|b')).toBe(true);
    expect(new RegExp(escapeRegex('a|b')).test('a')).toBe(false);
  });

  it('escapes square brackets ([])', () => {
    expect(() => new RegExp(escapeRegex('[abc'))).not.toThrow();
    expect(new RegExp(escapeRegex('[abc')).test('[abc')).toBe(true);
  });

  it('escapes backslash (\\)', () => {
    expect(() => new RegExp(escapeRegex('a\\b'))).not.toThrow();
  });

  it('leaves alphanumeric characters unchanged', () => {
    expect(escapeRegex('hello123')).toBe('hello123');
  });

  it('handles an empty string', () => {
    expect(escapeRegex('')).toBe('');
    expect(() => new RegExp(escapeRegex(''))).not.toThrow();
  });

  it('handles a string with only special characters', () => {
    const input = '.*+?^${}()|[]\\';
    expect(() => new RegExp(escapeRegex(input))).not.toThrow();
    expect(new RegExp(escapeRegex(input)).test(input)).toBe(true);
  });

  it('allows regex with escaped input to match exact literal text', () => {
    const input = 'Cost: $5.00 (discounted)';
    const regex = new RegExp(escapeRegex(input), 'i');
    expect(regex.test('Cost: $5.00 (discounted)')).toBe(true);
    expect(regex.test('Cost: discounted')).toBe(false);
  });
});
