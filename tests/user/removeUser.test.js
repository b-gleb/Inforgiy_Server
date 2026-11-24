// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import cache from '../../src/utils/cache.js';
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn()
}));
const { verifyToken } = await import('../../src/utils/jwt.js');

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const removeUserPermission = jest.fn();

const app = makeApp({
  getUser,
  removeUserPermission
});

const apiUrl = '/api/removeUser';
const callerId = 1230;
const mockUser = { id: callerId, username: 'test_user' };
const authToken = 'Bearer valid-token';

const branch = 'lns';
const validBody = {
  branch,
  userId: 4560
};

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    verifyToken.mockReturnValue(mockUser);
    getUser.mockResolvedValue(generateAdmin(branch, callerId));
    removeUserPermission.mockResolvedValue({ matchedCount: 1 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([{ userId: 4560 }, { branch }, {}, undefined, null])(
      'should respond with status code 400 for missing parameter: %j',
      async body => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body);
        expect(res.statusCode).toBe(400);
      }
    );

    it('should respond with status code 401 if no Authorization header is provided', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 401 if token is invalid or expired', async () => {
      verifyToken.mockReturnValueOnce(null);
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, callerId));
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Response Validation', () => {
    it('should respond with status code 204', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(204);
    });

    it('should respond with status code 404 if user to modify is not found', async () => {
      removeUserPermission.mockResolvedValueOnce({ matchedCount: 0 });
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(404);
    });

    it('should respond with no content', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.body).toEqual({});
      expect(res.text).toBe('');
    });
  });

  describe('Business Logic', () => {
    it('should call isRotaAdmin() once', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);

      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(callerId);
    });

    it('should call removeUserPermission() once', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);

      expect(removeUserPermission).toHaveBeenCalledTimes(1);
      expect(removeUserPermission).toHaveBeenCalledWith(branch, 4560);
    });

    it('should not call removeUserPermission() if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, callerId));
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);

      expect(removeUserPermission).toHaveBeenCalledTimes(0);
    });

    it('should delete cached entries', async () => {
      const delSpy = jest.spyOn(cache, 'del');
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);

      expect(delSpy).toHaveBeenCalledWith([
        `get.users.${branch}`,
        `get.user.${branch}.${validBody.userId}`
      ]);
    });
  });
});
