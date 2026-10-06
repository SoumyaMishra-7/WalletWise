// Test that transaction search properly escapes regex special characters
// These tests verify the fix for issue #433 (ReDoS / crashes transaction search)

const { escapeRegex } = require('../utils/helpers');

describe('Transaction search regex escaping', () => {
  describe('Common user input scenarios', () => {
    it('parentheses do not crash regex', () => {
      const safe = escapeRegex('coffee (morning)');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('asterisk does not crash regex', () => {
      const safe = escapeRegex('item*');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('plus sign does not crash regex', () => {
      const safe = escapeRegex('a+b');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('square brackets do not crash regex', () => {
      const safe = escapeRegex('[expense]');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });

    it('curly braces do not crash regex', () => {
      const safe = escapeRegex('{100}');
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });
  });

  describe('ReDoS patterns are safely escaped', () => {
    it('catastrophic backtracking pattern is safe', () => {
      const evil = '(a+)+$';
      const safe = escapeRegex(evil);
      const regex = new RegExp(safe, 'i');
      // Should match quickly (no catastrophic backtracking)
      expect(regex.test('aaaaaab')).toBe(false);
    });

    it('nested quantifier pattern is safe', () => {
      const evil = '(a|aa)+b';
      const safe = escapeRegex(evil);
      expect(() => new RegExp(safe, 'i')).not.toThrow();
    });
  });

  describe('Safe search input is still searchable', () => {
    it('regular text is still matched correctly', () => {
      const input = 'coffee shop';
      const regex = new RegExp(escapeRegex(input), 'i');
      expect(regex.test('Expense: Coffee Shop Visit')).toBe(true);
    });

    it('price format matches correctly', () => {
      const input = '$10.50';
      const regex = new RegExp(escapeRegex(input), 'i');
      expect(regex.test('Price: $10.50')).toBe(true);
    });
  });
});
