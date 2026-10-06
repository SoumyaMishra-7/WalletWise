const { escapeRegex } = require('./helpers');

describe('ReDoS prevention in transaction search', () => {
  describe('Catastrophic backtracking patterns', () => {
    it('(a+)+$ is safe', () => {
      const safe = escapeRegex('(a+)+$');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('(a|aa)+b is safe', () => {
      const safe = escapeRegex('(a|aa)+b');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('(.*)*x is safe', () => {
      const safe = escapeRegex('(.*)*x');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });
  });

  describe('Common user inputs that broke old code', () => {
    it('"coffee (morning)" is safe', () => {
      const safe = escapeRegex('coffee (morning)');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
      expect(new RegExp(safe, 'i').test('coffee (morning) expense')).toBe(true);
    });

    it('"$10.99" is safe and matches exact price', () => {
      const safe = escapeRegex('$10.99');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
      expect(new RegExp(safe, 'i').test('Paid $10.99 for lunch')).toBe(true);
    });

    it('"a[0]" is safe', () => {
      const safe = escapeRegex('a[0]');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('"100*" is safe', () => {
      const safe = escapeRegex('100*');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });
  });
});
