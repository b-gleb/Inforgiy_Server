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
const updateUser = jest.fn();
const addUserPermission = jest.fn();

const app = makeApp({
  getUser,
  updateUser,
  addUserPermission
});

const apiUrl = '/api/updateUser';
const callerId = 4560;
const mockUser = { id: callerId, username: 'test_user' };
const authToken = 'Bearer valid-token';

const branch = 'lns';
const existingUserObject = {
  id: 1230,
  username: '@username',
  nick: 'Nick',
  color: 0
};

const newUserObject = {
  username: '@username',
  nick: 'Nick',
  color: 0
};

const updateUserBody = {
  branch,
  userObj: existingUserObject
};

const addUserBody = {
  branch,
  userObj: newUserObject
};

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    verifyToken.mockReturnValue(mockUser);
    getUser.mockResolvedValue(generateAdmin(branch, callerId));
    updateUser.mockResolvedValue(generateUser(branch, 1230));
    addUserPermission.mockResolvedValue(generateUser(branch, 1230));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`Authentication POST ${apiUrl}`, () => {
    it('should respond with status code 401 if no Authorization header is provided', async () => {
      const res = await request(app).post(apiUrl).send(updateUserBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 401 if token is invalid or expired', async () => {
      verifyToken.mockReturnValueOnce(null);
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(res.statusCode).toBe(401);
    });
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it.each([
      { userObj: existingUserObject },
      { branch },
      { branch, userObj: { nick: 'Nick', color: 0 } },
      {},
      null,
      undefined
    ])('should respond with status code 400 for missing parameter: %#', async body => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(body);
      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 200', async () => {
      updateUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with status code 403 if non admin attempts to perform operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, callerId));
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 404 if user to modify does not exist', async () => {
      updateUser.mockResolvedValueOnce(null);
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(res.statusCode).toBe(404);
    });

    it('should respond with status code 404 if user to add permissions does not exist', async () => {
      addUserPermission.mockResolvedValueOnce(null);
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(addUserBody);
      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should call isRotaAdmin() once', async () => {
      await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(callerId);
    });

    it('should call updateUser() once when updating permissions of user with rota access', async () => {
      await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(updateUser).toHaveBeenCalledTimes(1);
      expect(updateUser).toHaveBeenCalledWith(
        branch,
        existingUserObject.id,
        existingUserObject.nick,
        existingUserObject.color
      );
    });

    it('should not call addUserPermission() when updating permissions of user with rota access', async () => {
      await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(updateUserBody);
      expect(addUserPermission).toHaveBeenCalledTimes(0);
    });

    it('should call addUserPermission() once when adding a new user to rota', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(addUserBody);
      expect(addUserPermission).toHaveBeenCalledTimes(1);
      expect(addUserPermission).toHaveBeenCalledWith(
        branch,
        newUserObject.username,
        newUserObject.nick,
        newUserObject.color
      );
    });

    it('should not call updateUser() when adding a new user to rota', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(addUserBody);
      expect(updateUser).toHaveBeenCalledTimes(0);
    });
  });

  [
    { name: 'updateUserBody', body: () => updateUserBody },
    { name: 'addUserBody', body: () => addUserBody }
  ].forEach(({ name, body }) => {
    describe(`RESPONSE VALIDATION POST ${apiUrl} with ${name}`, () => {
      it('should delete single user cache', async () => {
        const delSpy = jest.spyOn(cache, 'del');
        await request(app).post(apiUrl).set('Authorization', authToken).send(body());
        expect(delSpy).toHaveBeenCalledWith(`get.user.${branch}.${body().userObj.id}`);
      });

      it('should delete department cache', async () => {
        const delSpy = jest.spyOn(cache, 'del');
        await request(app).post(apiUrl).set('Authorization', authToken).send(body());

        expect(delSpy).toHaveBeenCalledWith(`get.users.${branch}`);
      });

      it('response should be a json object with properties "id", "username", "nick", "color"', async () => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body());

        const expectedProps = new Set(['id', 'username', 'nick', 'color']);
        const actualProps = new Set(Object.keys(res.body));

        expect(res.body).toBeInstanceOf(Object);
        expect(actualProps).toEqual(expectedProps);
      });

      it('object property "id" should be an integer', async () => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body());
        expect(Number.isInteger(res.body.id)).toBe(true);
      });

      it('object property "username" should be a string beginning with @', async () => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body());
        expect(
          typeof res.body.username === 'string' && res.body.username.startsWith('@')
        ).toBe(true);
      });

      it('object property "nick" should be a string', async () => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body());
        expect(typeof res.body.nick === 'string').toBe(true);
      });

      it('object property "color" should be an integer', async () => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body());
        expect(Number.isInteger(res.body.color)).toBe(true);
      });
    });
  });
});
