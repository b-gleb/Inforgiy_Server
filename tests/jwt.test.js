// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterAll, beforeAll, describe, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';

const originalToken = process.env.TOKEN;

beforeAll(() => {
  process.env.TOKEN = 'test-secret-token';
});

afterAll(() => {
  process.env.TOKEN = originalToken;
});

const { signToken, verifyToken } = await import('../src/utils/jwt.js');

describe('signToken', () => {
  it('should return a non-empty string', () => {
    const token = signToken({ id: 123, username: 'test' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should produce a token with three dot-separated parts', () => {
    const token = signToken({ id: 123, username: 'test' });
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyToken', () => {
  it('should decode a token signed by signToken and return the original payload plus iat and exp', () => {
    const payload = {
      id: 123,
      username: 'test'
    };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(123);
    expect(decoded.username).toBe('test');
    expect(decoded.aud).toBe('inforgiy-web');
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('should return null for an invalid token string', () => {
    const decoded = verifyToken('invalid.token.string');
    expect(decoded).toBeNull();
  });

  it('should return null for a token signed with a different secret', () => {
    const token = jwt.sign({ id: 123 }, 'wrong-secret');
    const decoded = verifyToken(token);
    expect(decoded).toBeNull();
  });
});
