// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { userSchema } from '../../schemas/user.schema.js';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const getUserCount = jest.fn();
const getBranchUsers = jest.fn();

const app = makeApp({
  getUser,
  getUserCount,
  getBranchUsers
});

const apiUrl = '/api/users';

describe(`POST ${apiUrl}`, () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    validBody = { branch, initDataUnsafe: { user: { id: 1230 } } };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, 1230));
    getUserCount.mockResolvedValue(1);
    getBranchUsers.mockResolvedValue([
      generateUser(branch, 4567),
      generateAdmin(branch, 1230)
    ]);
  });

  beforeEach(() => {
    validateInitData.mockClear();
    getUser.mockClear();
    getUserCount.mockClear();
    getBranchUsers.mockClear();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([
      { branch: Object.keys(settup)[0] },
      { initDataUnsafe: { user: { id: 1230 } } },
      {}
    ])('should respond with status code 400 for incomplete body: %j', async body => {
      const res = await request(app).post(apiUrl).send(body);
      expect(res.statusCode).toBe(400);
    });

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
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });

    it('should call getUserCount() once', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getUserCount).toHaveBeenCalledTimes(1);
      expect(getUserCount).toHaveBeenCalledWith(branch);
    });

    it('should not call getBranchUsers() when userCount matches cache', async () => {
      getUserCount.mockResolvedValueOnce(2);
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getBranchUsers).toHaveBeenCalledTimes(0);
    });

    it('should call getBranchUsers() once when userCount differs from cache', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getBranchUsers).toHaveBeenCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch);
    });
  });
});
