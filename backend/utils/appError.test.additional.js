const AppError = require('./appError');

describe('AppError — additional edge cases', () => {
  it('304 status starts with "3" → status is "error"', () => {
    // Only 4xx starts with '4' → 'fail'; everything else → 'error'
    const err = new AppError('Not modified', 304);
    expect(err.status).toBe('error');
  });

  it('201 status → error (not 4xx)', () => {
    expect(new AppError('Created', 201).status).toBe('error');
  });

  it('very long message is stored correctly', () => {
    const longMsg = 'Error: '.repeat(100);
    expect(new AppError(longMsg, 400).message).toBe(longMsg);
  });

  it('statusCode 0 → status is "error"', () => {
    expect(new AppError('Unknown', 0).status).toBe('error');
  });
});
