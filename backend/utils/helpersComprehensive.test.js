const { escapeRegex } = require('./helpers');

describe('escapeRegex — comprehensive coverage', () => {
  describe('All special regex characters escaped', () => {
    const specials = [
      ['.', '\.'],
      ['*', '\*'],
      ['+', '\+'],
      ['?', '\?'],
      ['^', '\^'],
      ['$', '\$'],
      ['{', '\{'],
      ['}', '\}'],
      ['(', '\('],
      [')', '\)'],
      ['|', '\|'],
      ['[', '\['],
      [']', '\]'],
      ['\', '\\'],
    ];

    specials.forEach(([char, escaped]) => {
      it(`escapes: ${JSON.stringify(char)}`, () => {
        expect(escapeRegex(char)).toBe(escaped);
      });
    });
  });

  it('non-special characters are not escaped', () => {
    expect(escapeRegex('hello')).toBe('hello');
    expect(escapeRegex('abc123')).toBe('abc123');
  });

  it('handles compound ReDoS pattern', () => {
    const safe = escapeRegex('(a+)+$');
    expect(() => new RegExp(safe)).not.toThrow();
  });

  it('handles empty string', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('handles string with only special chars', () => {
    const safe = escapeRegex('.**+?');
    expect(() => new RegExp(safe)).not.toThrow();
  });
});
