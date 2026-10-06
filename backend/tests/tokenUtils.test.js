'use strict';

// Set env vars before requiring tokens module
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

const jwt = require('jsonwebtoken');
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpirationDate,
} = require('../utils/tokens');

const mockUser = {
  _id: { toString: () => '6501234567890abc12345678' },
  email: 'test@example.com',
};

describe('signAccessToken', () => {
  it('returns a JWT string', () => {
    const token = signAccessToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // header.payload.signature
  });

  it('payload contains sub and email', () => {
    const token = signAccessToken(mockUser);
    const payload = jwt.decode(token);
    expect(payload.sub).toBe('6501234567890abc12345678');
    expect(payload.email).toBe('test@example.com');
  });

  it('token expires in the future', () => {
    const token = signAccessToken(mockUser);
    const payload = jwt.decode(token);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('generates different tokens for different users', () => {
    const user1 = { _id: { toString: () => 'aaa' }, email: 'a@a.com' };
    const user2 = { _id: { toString: () => 'bbb' }, email: 'b@b.com' };
    expect(signAccessToken(user1)).not.toBe(signAccessToken(user2));
  });
});

describe('signRefreshToken', () => {
  it('returns a JWT string', () => {
    const token = signRefreshToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('payload contains sub and tokenType', () => {
    const token = signRefreshToken(mockUser);
    const payload = jwt.decode(token);
    expect(payload.sub).toBe('6501234567890abc12345678');
    expect(payload.tokenType).toBe('refresh');
  });

  it('refresh token does NOT contain email', () => {
    const token = signRefreshToken(mockUser);
    const payload = jwt.decode(token);
    expect(payload.email).toBeUndefined();
  });
});

describe('verifyAccessToken', () => {
  it('successfully verifies a valid access token', () => {
    const token = signAccessToken(mockUser);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('6501234567890abc12345678');
    expect(payload.email).toBe('test@example.com');
  });

  it('throws for an invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => verifyAccessToken('')).toThrow();
  });
});

describe('verifyRefreshToken', () => {
  it('successfully verifies a valid refresh token', () => {
    const token = signRefreshToken(mockUser);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('6501234567890abc12345678');
  });

  it('throws for an access token (signed with a different secret)', () => {
    const accessToken = signAccessToken(mockUser);
    // Refresh verifier uses a different secret — this should throw
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe('getTokenExpirationDate', () => {
  it('returns a Date object for a valid token', () => {
    const token = signAccessToken(mockUser);
    const expiry = getTokenExpirationDate(token);
    expect(expiry instanceof Date).toBe(true);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns null for a malformed token without exp', () => {
    // Create a token without exp
    const noExpToken = jwt.sign({ sub: 'abc' }, 'test_access_secret');
    const result = getTokenExpirationDate(noExpToken);
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getTokenExpirationDate(null)).toBeNull();
  });
});
