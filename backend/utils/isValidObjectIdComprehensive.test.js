const { isValidObjectId } = require('./validation');
const mongoose = require('mongoose');

describe('isValidObjectId — comprehensive validation', () => {
  describe('Valid ObjectIds', () => {
    it('accepts fresh generated ObjectId', () => {
      const id = new mongoose.Types.ObjectId().toString();
      expect(isValidObjectId(id)).toBe(true);
    });

    it('accepts known valid hex ObjectId', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('507f191e810c19729de860ea')).toBe(true);
    });
  });

  describe('Invalid formats', () => {
    it('rejects 23-char string (1 short)', () => {
      expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false);
    });

    it('rejects 25-char string (1 long)', () => {
      expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false);
    });

    it('rejects non-hex characters', () => {
      expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd79943901z')).toBe(false);
    });

    it('rejects object (prototype pollution vector)', () => {
      expect(isValidObjectId({ $gt: '' } as unknown as string)).toBe(false);
    });

    it('rejects array', () => {
      expect(isValidObjectId(['507f1f77bcf86cd799439011'] as unknown as string)).toBe(false);
    });

    it('rejects boolean', () => {
      expect(isValidObjectId(true as unknown as string)).toBe(false);
    });
  });
});
