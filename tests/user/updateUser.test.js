import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');

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

describe(`POST ${apiUrl}`, () => {
  let branch;
  let updateUserBody;
  let addUserBody;
  let existingUserObject;
  let newUserObject;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    existingUserObject = {
      id: 1230,
      username: '@username',
      nick: 'Nick',
      color: 0
    };

    newUserObject = {
      username: '@username',
      nick: 'Nick',
      color: 0
    };

    updateUserBody = {
      branch,
      userObj: existingUserObject,
      initDataUnsafe: { user: { id: 4560 } }
    };

    addUserBody = {
      branch,
      userObj: newUserObject,
      initDataUnsafe: { user: { id: 4560 } }
    };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, 4560));
    updateUser.mockResolvedValue(generateUser(branch, 1230));
    addUserPermission.mockResolvedValue(generateUser(branch, 1230));
  });

  beforeEach(() => {
    validateInitData.mockClear();
    getUser.mockClear();
    updateUser.mockClear();
    addUserPermission.mockClear();
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const validUserObj = {
        id: 1230,
        username: '@username',
        nick: 'Nick',
        color: 0
      };

      // biome-ignore format: keep test cases on separate lines
      const bodyData = [
        { userObj: validUserObj, initDataUnsafe: { user: { id: 1230 } } },
        { branch, initDataUnsafe: { user: { id: 1230 } } },
        { branch, userObj: validUserObj },
        { branch, userObj: { nick: 'Nick', color: 0 }, initDataUnsafe: { user: { id: 1230 } } },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post(apiUrl).send(body);
        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 200', async () => {
      updateUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post(apiUrl).send(updateUserBody);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post(apiUrl).send(updateUserBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if non admin attempts to perform operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 4560));
      const res = await request(app).post(apiUrl).send(updateUserBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 404 if user to modify does not exist', async () => {
      updateUser.mockResolvedValueOnce(null);
      const res = await request(app).post(apiUrl).send(updateUserBody);
      expect(res.statusCode).toBe(404);
    });

    it('should respond with status code 404 if user to add permissions does not exist', async () => {
      addUserPermission.mockResolvedValueOnce(null);
      const res = await request(app).post(apiUrl).send(addUserBody);
      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(updateUserBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should call isRotaAdmin() once', async () => {
      const _res = await request(app).post(apiUrl).send(updateUserBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(4560);
    });

    it('should call updateUser() once when updating permissions of user with rota access', async () => {
      const _res = await request(app).post(apiUrl).send(updateUserBody);
      expect(updateUser).toHaveBeenCalledTimes(1);
      expect(updateUser).toHaveBeenCalledWith(
        branch,
        existingUserObject.id,
        existingUserObject.nick,
        existingUserObject.color
      );
    });

    it('should not call addUserPermission() when updating permissions of user with rota access', async () => {
      const _res = await request(app).post(apiUrl).send(updateUserBody);
      expect(addUserPermission).toHaveBeenCalledTimes(0);
    });

    it('should call addUserPermission() once when adding a new user to rota', async () => {
      const _res = await request(app).post(apiUrl).send(addUserBody);
      expect(addUserPermission).toHaveBeenCalledTimes(1);
      expect(addUserPermission).toHaveBeenCalledWith(
        branch,
        newUserObject.username,
        newUserObject.nick,
        newUserObject.color
      );
    });

    it('should not call updateUser() when adding a new user to rota', async () => {
      const _res = await request(app).post(apiUrl).send(addUserBody);
      expect(updateUser).toHaveBeenCalledTimes(0);
    });
  });

  [
    { name: 'updateUserBody', body: () => updateUserBody },
    { name: 'addUserBody', body: () => addUserBody }
  ].forEach(({ name, body }) => {
    describe(`RESPONSE VALIDATION POST ${apiUrl} with ${name}`, () => {
      it('response should be a json object with properties "id", "username", "nick", "color"', async () => {
        const res = await request(app).post(apiUrl).send(body());

        const expectedProps = ['id', 'username', 'nick', 'color'].sort();
        const actualProps = Object.keys(res.body).sort();

        expect(res.body).toBeInstanceOf(Object);
        expect(JSON.stringify(actualProps) === JSON.stringify(expectedProps)).toBe(true);
      });

      it('object property "id" should be an integer', async () => {
        const res = await request(app).post(apiUrl).send(body());
        expect(Number.isInteger(res.body.id)).toBe(true);
      });

      it('object property "username" should be a string beginning with @', async () => {
        const res = await request(app).post(apiUrl).send(body());
        expect(
          typeof res.body.username === 'string' && res.body.username.startsWith('@')
        ).toBe(true);
      });

      it('object property "nick" should be a string', async () => {
        const res = await request(app).post(apiUrl).send(body());
        expect(typeof res.body.nick === 'string').toBe(true);
      });

      it('object property "color" should be an integer', async () => {
        const res = await request(app).post(apiUrl).send(body());
        expect(Number.isInteger(res.body.color)).toBe(true);
      });
    });
  });
});
