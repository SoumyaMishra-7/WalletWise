const { escapeRegex } = require('./helpers');

describe('escapeRegex', () => {
  it('returns unchanged string with no special chars', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
  });

  it('escapes dot (.)', () => {
    expect(escapeRegex('file.txt')).toBe('file\.txt');
  });

  it('escapes asterisk (*)', () => {
    expect(escapeRegex('a*b')).toBe('a\*b');
  });

  it('escapes plus (+)', () => {
    expect(escapeRegex('a+b')).toBe('a\+b');
  });

  it('escapes question mark (?)', () => {
    expect(escapeRegex('a?b')).toBe('a\?b');
  });

  it('escapes caret (^)', () => {
    expect(escapeRegex('^start')).toBe('\^start');
  });

  it('escapes dollar sign ($)', () => {
    expect(escapeRegex('end$')).toBe('end\$');
  });

  it('escapes curly braces', () => {
    expect(escapeRegex('a{2}')).toBe('a\{2\}');
  });

  it('escapes parentheses', () => {
    expect(escapeRegex('(a|b)')).toBe('\(a\|b\)');
  });

  it('escapes square brackets', () => {
    expect(escapeRegex('[abc]')).toBe('\[abc\]');
  });

  it('escapes backslash', () => {
    expect(escapeRegex('a\b')).toBe('a\\b');
  });

  it('escaped result is safe for use in RegExp', () => {
    const userInput = 'hello (world) $50 + tax';
    const escaped = escapeRegex(userInput);
    expect(() => new RegExp(escaped)).not.toThrow();
  });

  it('matches exact string when used in RegExp', () => {
    const userInput = 'cost: $10.50';
    const regex = new RegExp(escapeRegex(userInput));
    expect(regex.test('cost: $10.50')).toBe(true);
    expect(regex.test('cost: $1050')).toBe(false);
  });

  it('handles empty string', () => {
    expect(escapeRegex('')).toBe('');
  });
});
