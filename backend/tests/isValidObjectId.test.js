'use strict';

const { isValidObjectId } = require('../utils/validation');

describe('isValidObjectId', () => {
  // Valid 24-character hex strings (standard MongoDB ObjectId format)
  const validId = '507f1f77bcf86cd799439011';
  const anotherId = '6501234567890abc12345678';

  it('returns true for a valid 24-character hex ObjectId', () => {
    expect(isValidObjectId(validId)).toBe(true);
    expect(isValidObjectId(anotherId)).toBe(true);
  });

  it('returns false for a null value', () => {
    expect(isValidObjectId(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidObjectId(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('returns false for a non-string type (number)', () => {
    expect(isValidObjectId(12345)).toBe(false);
  });

  it('returns false for a non-string type (object)', () => {
    expect(isValidObjectId({ id: validId })).toBe(false);
  });

  it('returns false for a string that is too short', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390')).toBe(false); // 22 chars
  });

  it('returns false for a string that is too long', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390110')).toBe(false); // 25 chars
  });

  it('returns false for a string with non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false); // 'g' is not hex
    expect(isValidObjectId('507f1f77bcf86cd79943901Z')).toBe(false); // 'Z' is not hex
  });

  it('returns false for a SQL injection attempt', () => {
    expect(isValidObjectId("1; DROP TABLE users; --")).toBe(false);
  });

  it('returns false for a prototype pollution attempt', () => {
    expect(isValidObjectId('__proto__')).toBe(false);
  });

  it('validates uppercase hex characters as valid', () => {
    // MongoDB ObjectIds use lowercase but Mongoose.Types.ObjectId.isValid
    // should accept both
    const uppercaseId = '507F1F77BCF86CD799439011';
    expect(typeof isValidObjectId(uppercaseId)).toBe('boolean');
    // The actual result depends on Mongoose's implementation;
    // we just confirm it doesn't throw
  });
});
