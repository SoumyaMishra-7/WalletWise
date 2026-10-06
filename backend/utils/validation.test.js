const { isValidObjectId } = require('./validation');

describe('isValidObjectId', () => {
  it('accepts a valid 24-char hex ObjectId', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('accepts another valid ObjectId', () => {
    expect(isValidObjectId('64a7f1234567890abcdef012')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidObjectId(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidObjectId(undefined)).toBe(false);
  });

  it('rejects a non-string value (number)', () => {
    expect(isValidObjectId(12345)).toBe(false);
  });

  it('rejects a non-string value (object)', () => {
    expect(isValidObjectId({ id: '507f1f77bcf86cd799439011' })).toBe(false);
  });

  it('rejects a too-short string', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false);
  });

  it('rejects a too-long string', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false);
  });

  it('rejects a string with non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901z')).toBe(false);
  });

  it('rejects "test" injection string', () => {
    expect(isValidObjectId('{ "$gt": "" }')).toBe(false);
  });
});
