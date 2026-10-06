'use strict';

const errHandler = require('../middleware/errorHandler');

const mockReq = {};
const mockNext = jest.fn();

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('errHandler middleware', () => {
  it('uses err.statusCode when present', () => {
    const err = { statusCode: 422, message: 'Unprocessable' }
    const res = mockRes()
    errHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('defaults to statusCode 500 when not present', () => {
    const err = new Error('Unknown error')
    const res = mockRes()
    errHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('returns success: false in JSON body', () => {
    const err = { statusCode: 400, message: 'Bad request' }
    const res = mockRes()
    errHandler(err, mockReq, res, mockNext)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
  })

  it('returns the error message for non-500 errors', () => {
    const err = { statusCode: 400, message: 'Bad request' }
    const res = mockRes()
    errHandler(err, mockReq, res, mockNext)
    const body = res.json.mock.calls[0][0]
    expect(body.message).toBe('Bad request')
  })

  it('returns "Internal Server Error" for 500 errors instead of the raw message', () => {
    const err = new Error('Sensitive internal detail')
    const res = mockRes()
    errHandler(err, mockReq, res, mockNext)
    const body = res.json.mock.calls[0][0]
    expect(body.message).toBe('Internal Server Error')
    expect(body.message).not.toContain('Sensitive')
  })

  it('handles errors without a message property', () => {
    const err = { statusCode: 400 }
    const res = mockRes()
    expect(() => errHandler(err, mockReq, res, mockNext)).not.toThrow()
  })

  it('handles errors with undefined statusCode and no message', () => {
    const err = {}
    const res = mockRes()
    expect(() => errHandler(err, mockReq, res, mockNext)).not.toThrow()
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
