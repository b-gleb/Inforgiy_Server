// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { userSchema } from '../../schemas/user.schema.js';
import cache from '../../src/utils/cache.js';
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const getBranchUsers = jest.fn();

const app = makeApp({
  getUser,
  getBranchUsers
});

const apiUrl = '/api/users';

describe(`POST ${apiUrl}`, () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = 'lns';
    validBody = { branch, initDataUnsafe: { user: { id: 1230 } } };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, 1230));
    getBranchUsers.mockResolvedValue([
      generateUser(branch, 4567),
      generateAdmin(branch, 1230)
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cache.flushAll();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([{ branch }, { initDataUnsafe: { user: { id: 1230 } } }, {}])(
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

    it('should respond with status code 403 if non admin user requests operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with a status code of 500 if DB call fails', async () => {
      // suppress console.error output
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      getUser.mockRejectedValueOnce(new Error('DB exception occured'));
      const res = await request(app).post(apiUrl).send(validBody);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: 'Internal server error'
      });

      errorSpy.mockRestore();
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

    it('should return payload matching an array of userSchema', async () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validSchema = ajv.compile({
        type: 'array',
        items: userSchema
      });

      const res = await request(app).post(apiUrl).send(validBody);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }

      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should call isRotaAdmin() once', async () => {
      await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });

    it('should call getBranchUsers() once', async () => {
      await request(app).post(apiUrl).send(validBody);
      expect(getBranchUsers).toHaveBeenCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch);
    });

    it('should not call getBranchUsers() twice and pull from cache', async () => {
      await request(app).post(apiUrl).send(validBody);
      await request(app).post(apiUrl).send(validBody);

      expect(getBranchUsers).toHaveBeenCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch);
    });
  });
});
