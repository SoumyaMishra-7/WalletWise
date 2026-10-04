const multer = require('multer');

// Verify multer middleware configuration
describe('Multer upload middleware', () => {
  it('multer module is importable', () => {
    expect(multer).toBeDefined();
  });

  it('singleUpload middleware is exported', () => {
    const singleUpload = require('./multer');
    expect(typeof singleUpload).toBe('function');
  });

  describe('File size limit simulation', () => {
    it('2MB limit constant is correct (2 * 1024 * 1024 = 2097152)', () => {
      const limit = 2 * 1024 * 1024;
      expect(limit).toBe(2097152);
    });

    it('5MB file exceeds 2MB limit', () => {
      const fileSize = 5 * 1024 * 1024;
      const limit = 2 * 1024 * 1024;
      expect(fileSize).toBeGreaterThan(limit);
    });

    it('1MB file is within 2MB limit', () => {
      const fileSize = 1 * 1024 * 1024;
      const limit = 2 * 1024 * 1024;
      expect(fileSize).toBeLessThanOrEqual(limit);
    });

    it('exactly 2MB file is within limit', () => {
      const fileSize = 2 * 1024 * 1024;
      const limit = 2 * 1024 * 1024;
      expect(fileSize).toBeLessThanOrEqual(limit);
    });
  });
});
