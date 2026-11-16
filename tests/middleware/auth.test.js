// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyToken: jest.fn()
}));

const { verifyToken } = await import('../../src/utils/jwt.js');
const { authenticate } = await import('../../src/middleware/auth.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.post('/protected', authenticate, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

const app = makeApp();

describe('authenticate middleware', () => {
  const mockPayload = {
    id: 1230,
    username: 'test',
    branches: { lns: { color: 0, maxDuties: 3 } },
    rotaAdmin: ['lns']
  };

  beforeAll(() => {
    verifyToken.mockReturnValue(mockPayload);
  });

  beforeEach(() => {
    verifyToken.mockClear();
  });

  it('should allow access with a valid Bearer token and call next()', async () => {
    verifyToken.mockReturnValue(mockPayload);
    const res = await request(app)
      .post('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(verifyToken).toHaveBeenCalledTimes(1);
    expect(verifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('should respond with 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/protected');

    expect(res.statusCode).toBe(401);
    expect(res.text).toBe('No valid authorization header');
    expect(verifyToken).toHaveBeenCalledTimes(0);
  });

  it('should respond with 401 when Authorization header has no Bearer prefix', async () => {
    const res = await request(app).post('/protected').set('Authorization', 'some-token');

    expect(res.statusCode).toBe(401);
    expect(res.text).toBe('No valid authorization header');
    expect(verifyToken).toHaveBeenCalledTimes(0);
  });

  it('should respond with 401 when the token is invalid or expired (verifyToken returns null)', async () => {
    verifyToken.mockReturnValueOnce(null);
    const res = await request(app)
      .post('/protected')
      .set('Authorization', 'Bearer expired-token');

    expect(res.statusCode).toBe(401);
    expect(res.text).toBe('Invalid or expired token');
    expect(verifyToken).toHaveBeenCalledTimes(1);
  });
});
