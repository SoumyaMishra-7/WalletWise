'use strict';

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

describe('AppError', () => {
  it('inherits from Error', () => {
    const err = new AppError('test message', 400);
    expect(err instanceof Error).toBe(true);
    expect(err instanceof AppError).toBe(true);
  });

  it('sets message, statusCode, and status', () => {
    const err = new AppError('Not Found', 404);
    expect(err.message).toBe('Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.status).toBe('fail');
  });

  it('sets status to "fail" for 4xx codes', () => {
    [400, 401, 403, 404, 422, 409].forEach(code => {
      const err = new AppError('err', code);
      expect(err.status).toBe('fail');
    });
  });

  it('sets status to "error" for 5xx codes', () => {
    [500, 502, 503].forEach(code => {
      const err = new AppError('err', code);
      expect(err.status).toBe('error');
    });
  });

  it('sets isOperational to true', () => {
    const err = new AppError('Server error', 500);
    expect(err.isOperational).toBe(true);
  });

  it('has a stack trace', () => {
    const err = new AppError('Something went wrong', 500);
    expect(err.stack).toBeDefined();
  });
});

describe('catchAsync', () => {
  const mockReq = {};
  const mockRes = {};

  it('calls the wrapped function with req, res, next', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const wrapped = catchAsync(fn);
    const next = jest.fn();

    await wrapped(mockReq, mockRes, next);

    expect(fn).toHaveBeenCalledWith(mockReq, mockRes, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with the error when the wrapped function rejects', async () => {
    const error = new AppError('Async error', 400);
    const fn = jest.fn().mockRejectedValue(error);
    const wrapped = catchAsync(fn);
    const next = jest.fn();

    await wrapped(mockReq, mockRes, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not catch synchronous errors (they would propagate normally)', async () => {
    const syncError = new Error('sync error');
    const fn = () => {
      throw syncError;
    };
    const wrapped = catchAsync(fn);
    const next = jest.fn();

    expect(() => wrapped(mockReq, mockRes, next)).toThrow('sync error');
  });

  it('returns the result of the wrapped function', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    const wrapped = catchAsync(fn);
    const next = jest.fn();

    const result = await wrapped(mockReq, mockRes, next);
    expect(result).toBe('result');
  });
});
