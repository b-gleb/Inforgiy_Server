// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import cache from '../../src/utils/cache.js';
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const removeUserPermission = jest.fn();

const app = makeApp({
  getUser,
  removeUserPermission
});

const apiUrl = '/api/removeUser';
const branch = Object.keys(settup)[0];
const validBody = {
  branch,
  userId: 4560,
  initDataUnsafe: { user: { id: 1230 } }
};

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, 1230));
    removeUserPermission.mockResolvedValue({ matchedCount: 1 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([
      { userId: 4560, initDataUnsafe: { user: { id: 1230 } } },
      { branch, initDataUnsafe: { user: { id: 1230 } } },
      { branch, userId: 4560 },
      {}
    ])('should respond with status code 400 for missing parameter: %j', async body => {
      const res = await request(app).post(apiUrl).send(body);
      expect(res.statusCode).toBe(400);
    });

    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Response Validation', () => {
    it('should respond with status code 204', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(204);
    });

    it('should respond with status code 404 if user to modify is not found', async () => {
      removeUserPermission.mockResolvedValueOnce({ matchedCount: 0 });
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(404);
    });

    it('should respond with no content', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body).toEqual({});
      expect(res.text).toBe('');
    });
  });

  describe('Business Logic', () => {
    it('should call isRotaAdmin() once', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });

    it('should call removeUserPermission() once', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(removeUserPermission).toHaveBeenCalledTimes(1);
      expect(removeUserPermission).toHaveBeenCalledWith(branch, 4560);
    });

    it('should not call removeUserPermission() if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(removeUserPermission).toHaveBeenCalledTimes(0);
    });

    it('should delete cached entries', async () => {
      const delSpy = jest.spyOn(cache, 'del');
      await request(app).post(apiUrl).send(validBody);

      expect(delSpy).toHaveBeenCalledWith([
        `get.users.${branch}`,
        `get.user.${branch}.${validBody.userId}`
      ]);
    });
  });
});
