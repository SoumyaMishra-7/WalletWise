const AppError = require('./appError');

describe('AppError', () => {
  it('is an instance of Error', () => {
    const err = new AppError('Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('stores the message', () => {
    expect(new AppError('Bad request', 400).message).toBe('Bad request');
  });

  it('stores the statusCode', () => {
    expect(new AppError('Not found', 404).statusCode).toBe(404);
  });

  it('status is "fail" for 4xx codes', () => {
    expect(new AppError('Not found', 404).status).toBe('fail');
    expect(new AppError('Bad request', 400).status).toBe('fail');
    expect(new AppError('Unauthorized', 401).status).toBe('fail');
  });

  it('status is "error" for 5xx codes', () => {
    expect(new AppError('Server error', 500).status).toBe('error');
    expect(new AppError('Service unavailable', 503).status).toBe('error');
  });

  it('isOperational is true', () => {
    expect(new AppError('test', 400).isOperational).toBe(true);
  });

  it('can be caught as Error', () => {
    expect(() => { throw new AppError('test', 500); }).toThrow(Error);
  });
});
