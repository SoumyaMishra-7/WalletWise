const catchAsync = require('./catchAsync');

describe('catchAsync', () => {
  it('returns a middleware function', () => {
    const handler = async (req, res, next) => {};
    const wrapped = catchAsync(handler);
    expect(typeof wrapped).toBe('function');
  });

  it('calls the original handler function', async () => {
    let handlerCalled = false;
    const handler = async (req, res, next) => { handlerCalled = true; };
    const wrapped = catchAsync(handler);
    await wrapped({}, {}, () => {});
    expect(handlerCalled).toBe(true);
  });

  it('passes req, res, next to the handler', async () => {
    const received = {};
    const handler = async (req, res, next) => {
      received.req = req;
      received.res = res;
      received.next = next;
    };
    const req = { test: 'req' };
    const res = { test: 'res' };
    const next = () => {};
    await catchAsync(handler)(req, res, next);
    expect(received.req).toBe(req);
    expect(received.res).toBe(res);
    expect(received.next).toBe(next);
  });

  it('calls next with error when handler throws', async () => {
    const error = new Error('something went wrong');
    const handler = async () => { throw error; };
    const wrapped = catchAsync(handler);
    let caughtError = null;
    await wrapped({}, {}, (err) => { caughtError = err; });
    expect(caughtError).toBe(error);
  });

  it('does not call next with error when handler succeeds', async () => {
    const handler = async (req, res, next) => { res.done = true; };
    const res = {};
    let nextCalledWith = 'not_called';
    await catchAsync(handler)({}, res, (err) => { nextCalledWith = err; });
    expect(nextCalledWith).toBe('not_called');
    expect(res.done).toBe(true);
  });
});
