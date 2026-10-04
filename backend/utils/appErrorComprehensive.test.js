const AppError = require('./appError');

describe('AppError — comprehensive property tests', () => {
  const testCases = [
    { msg: 'Bad Request', code: 400, expectedStatus: 'fail' },
    { msg: 'Unauthorized', code: 401, expectedStatus: 'fail' },
    { msg: 'Forbidden', code: 403, expectedStatus: 'fail' },
    { msg: 'Not Found', code: 404, expectedStatus: 'fail' },
    { msg: 'Conflict', code: 409, expectedStatus: 'fail' },
    { msg: 'Unprocessable Entity', code: 422, expectedStatus: 'fail' },
    { msg: 'Internal Server Error', code: 500, expectedStatus: 'error' },
    { msg: 'Not Implemented', code: 501, expectedStatus: 'error' },
    { msg: 'Service Unavailable', code: 503, expectedStatus: 'error' },
  ];

  testCases.forEach(({ msg, code, expectedStatus }) => {
    it(`AppError(${code}) has status "${expectedStatus}"`, () => {
      const err = new AppError(msg, code);
      expect(err.message).toBe(msg);
      expect(err.statusCode).toBe(code);
      expect(err.status).toBe(expectedStatus);
      expect(err.isOperational).toBe(true);
    });
  });

  it('all 4xx codes produce "fail" status', () => {
    [400, 401, 403, 404, 409, 422, 429].forEach((code) => {
      expect(new AppError('test', code).status).toBe('fail');
    });
  });

  it('all 5xx codes produce "error" status', () => {
    [500, 501, 502, 503, 504].forEach((code) => {
      expect(new AppError('test', code).status).toBe('error');
    });
  });
});
