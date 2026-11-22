// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { jwtResponseSchema } from '../../schemas/jwtResponse.schema.js';
import { generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn()
}));

const { validateInitData } = await import('../../src/utils/initDataValidation.js');
const { signToken } = await import('../../src/utils/jwt.js');
const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();

const app = makeApp({
  getUser
});

const ajv = new Ajv({ allErrors: true, strict: true });
const apiUrl = '/api/auth/telegram-webapp';

const initDataUnsafe = { user: { id: 1230, username: 'test_user' } };
const validBody = { initDataUnsafe };
const userData = generateUser('lns', 1230);
const mockToken = 'mock-jwt-token';

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    validateInitData.mockReturnValue(true);
    signToken.mockReturnValue(mockToken);
    getUser.mockResolvedValue(userData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([{}, null, undefined])(
      'should respond with status code 400 for incomplete body: %j',
      async body => {
        const res = await request(app).post(apiUrl).send(body);
        expect(res.statusCode).toBe(400);
      }
    );

    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 404 if user is not found', async () => {
      getUser.mockResolvedValueOnce(null);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(404);
    });

    it('should respond with status code 403 if user has no roles', async () => {
      getUser.mockResolvedValueOnce({
        telegram: '@username_1230',
        roles: {}
      });
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Response Validation', () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching jwtResponse schema', async () => {
      const validSchema = ajv.compile(jwtResponseSchema);
      const res = await request(app).post(apiUrl).send(validBody);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }
      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should call validateInitData once', async () => {
      await request(app).post(apiUrl).send(validBody);
      expect(validateInitData).toHaveBeenCalledTimes(1);
    });

    it('should call getUser once', async () => {
      await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(initDataUnsafe.user.id);
    });

    it('should not call getUser if validateInitData failed', async () => {
      validateInitData.mockReturnValueOnce(false);
      await request(app).post(apiUrl).send(validBody);
      expect(validateInitData).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledTimes(0);
    });

    it('should call signToken once', async () => {
      await request(app).post(apiUrl).send(validBody);
      expect(signToken).toHaveBeenCalledTimes(1);
      expect(signToken).toHaveBeenCalledWith({
        id: initDataUnsafe.user.id,
        username: initDataUnsafe.user.username
      });
    });

    it('should not call signToken if validateInitData failed', async () => {
      validateInitData.mockReturnValueOnce(false);
      await request(app).post(apiUrl).send(validBody);
      expect(signToken).toHaveBeenCalledTimes(0);
    });

    it('should not call signToken if user is not found', async () => {
      getUser.mockResolvedValueOnce(null);
      await request(app).post(apiUrl).send(validBody);
      expect(signToken).toHaveBeenCalledTimes(0);
    });

    it('should not call signToken if user has no roles', async () => {
      getUser.mockResolvedValueOnce({
        telegram: '@username_1230',
        roles: {}
      });
      await request(app).post(apiUrl).send(validBody);
      expect(signToken).toHaveBeenCalledTimes(0);
    });
  });
});
