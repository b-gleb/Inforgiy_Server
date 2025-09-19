import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };

jest.unstable_mockModule('../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const {validateInitData} = await import('../../src/utils/initDataValidation.js');

const makeApp = (await import('../../src/app.js')).default;

function generateUser (branch, id) {
  return ({
    telegram: `@username_${id}`,
    telegram_id: id,
    roles: {
      [`rota_${branch}`]: {
        nick: `Nick_${id}`,
        c: 0
      }
    }
  });
};

function generateAdmin (branch, id) {
  const user = generateUser(branch, id);
  user.roles[`admin_rota_${branch}`] = null;
  return user;
};


const getUser = jest.fn();
const getUserCount = jest.fn();
const getBranchUsers = jest.fn();
const removeUserPermission = jest.fn();
const updateUser = jest.fn();
const addUserPermission = jest.fn();

const app = makeApp({
  getUserCount,
  getBranchUsers,
  removeUserPermission,
  updateUser,
  addUserPermission,
  getUser
});

describe('GET /api/users', () => {
  describe('INVALID PARAMETERS GET /api/users', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {branch: Object.keys(settup)[0]},
        {initDataUnsafe: {user: {id: 1230}}},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).get('/api/users').query(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });


  describe('VALID PARAMETERS GET /api/users', () => {
    let branch;
    let body;

    beforeAll(() => {
      branch = Object.keys(settup)[0];
      body = {branch, initDataUnsafe: {user: {id: 1230}}};

      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(0);
      getBranchUsers.mockResolvedValue([]);
    });


    beforeEach(() => {
      validateInitData.mockClear();
      getUser.mockClear();
      getUserCount.mockClear();
      getBranchUsers.mockClear();
    });

    it('should respond with status code 200', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.statusCode).toBe(200);
    });


    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).get('/api/users').query(body);
      expect(res.statusCode).toBe(401);
    });


    it('should respond with status code 403 if non admin user requests operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).get('/api/users').query(body);
      expect(res.statusCode).toBe(403);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call isRotaAdmin() once', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(getUser).toBeCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });


    it('should call getUserCount() once', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(getUserCount).toBeCalledTimes(1);
      expect(getUserCount).toHaveBeenCalledWith(branch);
    });


    it('should not call getBranchUsers() when userCount matches cache', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(getBranchUsers).toBeCalledTimes(0);
    });


    it('should call getBranchUsers() once when userCount differs from cache', async () => {
      getUserCount.mockResolvedValueOnce(1);
      const res = await request(app).get('/api/users').query(body);
      expect(getBranchUsers).toBeCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch)
    });
  });


  describe('RESPONSE VALIDATION GET /api/users', () => {
    let branch;
    let body;

    beforeAll(() => {
      branch = Object.keys(settup)[0];
      body = {branch, initDataUnsafe: {user: {id: 1230}}};
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(1);
      getBranchUsers.mockResolvedValue([generateUser(branch, 4567), generateAdmin(branch, 1230)]);
    });


    beforeEach(() => {
      validateInitData.mockClear();
      getUser.mockClear();
      getUserCount.mockClear();
      getBranchUsers.mockClear();
    });

    it('response should be an array of objects', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item != null)).toBe(true);
    });


    it('response object should only have properties: "id", "username", "nick", "color"', async () => {
      const res = await request(app).get('/api/users').query(body);
      
      const expectedProps = ['id', 'username', 'nick', 'color'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort());
      });

      expect(allHaveExpectedProps).toBe(true);
    });


    it('response object property "id" should be an integer', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.body.every(item => Number.isInteger(item.id))).toBe(true);
    });


    it('response object property "username" should be a string beginning with @', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.body.every(item => typeof item.username === 'string' && item.username.startsWith('@'))).toBe(true);
    });


    it('response object property "nick" should be a string', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.body.every(item => typeof item.nick === 'string')).toBe(true);
    });


    it('response object property "color" should be an integer', async () => {
      const res = await request(app).get('/api/users').query(body);
      expect(res.body.every(item => Number.isInteger(item.color))).toBe(true);
    });
  });
});



describe('POST /api/updateUser', () => {
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
      nick: "Nick",
      color: 0
    };

    newUserObject = {
      username: '@username',
      nick: "Nick",
      color: 0
    };

    updateUserBody = {branch, userObj: existingUserObject, initDataUnsafe: {user: {id: 4560}}};
    addUserBody = {branch, userObj: newUserObject, initDataUnsafe: {user: {id: 4560}}};

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


  describe('INVALID PARAMETERS POST /api/updateUser', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const validUserObj = {
        id: 1230,
        username: '@username',
        nick: "Nick",
        color: 0
      };

      const bodyData = [
        {userObj: validUserObj, initDataUnsafe: {user: {id: 1230}}},
        {branch, initDataUnsafe: {user: {id: 1230}}},
        {branch, userObj: validUserObj},
        {branch, userObj: {nick: 'Nick', color: 0}, initDataUnsafe: {user: {id: 1230}}},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/updateUser').send(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });



  describe('VALID PARAMETERS POST /api/updateUser', () => {
    it('should respond with status code 200', async () => {
      updateUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(res.statusCode).toBe(200);
    });


    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(res.statusCode).toBe(401);
    });


    it('should respond with status code 403 if non admin attempts to perform operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 4560));
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(res.statusCode).toBe(403);
    });


    it('should respond with status code 404 if user to modify does not exist', async () => {
      updateUser.mockResolvedValueOnce(null);
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(res.statusCode).toBe(404);
    });


    it('should respond with status code 404 if user to add permissions does not exist', async () => {
      addUserPermission.mockResolvedValueOnce(null);
      const res = await request(app).post('/api/updateUser').send(addUserBody);
      expect(res.statusCode).toBe(404);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call isRotaAdmin() once', async () => {
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(4560);
    });


    it('should call updateUser() once when updating permissions of user with rota access', async () => {
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(updateUser).toHaveBeenCalledTimes(1);
      expect(updateUser).toHaveBeenCalledWith(
        branch,
        existingUserObject.id,
        existingUserObject.nick,
        existingUserObject.color
      );
    });


    it('should not call addUserPermission() when updating permissions of user with rota access', async () => {
      const res = await request(app).post('/api/updateUser').send(updateUserBody);
      expect(addUserPermission).toHaveBeenCalledTimes(0);
    });


    it('should call addUserPermission() once when adding a new user to rota', async () => {
      const res = await request(app).post('/api/updateUser').send(addUserBody);
      expect(addUserPermission).toHaveBeenCalledTimes(1);
      expect(addUserPermission).toHaveBeenCalledWith(
        branch,
        newUserObject.username,
        newUserObject.nick,
        newUserObject.color
      );
    });


    it('should not call updateUser() when adding a new user to rota', async () => {
      const res = await request(app).post('/api/updateUser').send(addUserBody);
      expect(updateUser).toHaveBeenCalledTimes(0);
    });
  });


  [
    { name: 'updateUserBody', body: () => updateUserBody },
    { name: 'addUserBody', body: () => addUserBody }
  ].forEach(({ name, body }) => {
    describe(`RESPONSE VALIDATION POST /api/updateUser with ${name}`, () => {
      it('response should be a json object with properties "id", "username", "nick", "color"', async () => {
        const res = await request(app).post('/api/updateUser').send(body());

        const expectedProps = ['id', 'username', 'nick', 'color'].sort();
        const actualProps = Object.keys(res.body).sort();

        expect(res.body).toBeInstanceOf(Object);
        expect(JSON.stringify(actualProps) === JSON.stringify(expectedProps)).toBe(true);
      });


      it('object property "id" should be an integer', async () => {
        const res = await request(app).post('/api/updateUser').send(body());
        expect(Number.isInteger(res.body.id)).toBe(true);
      });


      it('object property "username" should be a string beginning with @', async () => {
        const res = await request(app).post('/api/updateUser').send(body());
        expect(typeof res.body.username === 'string' && res.body.username.startsWith('@')).toBe(true);
      });


      it('object property "nick" should be a string', async () => {
        const res = await request(app).post('/api/updateUser').send(body());
        expect(typeof res.body.nick === 'string').toBe(true);
      });


      it('object property "color" should be an integer', async () => {
        const res = await request(app).post('/api/updateUser').send(body());
        expect(Number.isInteger(res.body.color)).toBe(true);
      });
    });
  });
});




describe('POST /api/removeUser', () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    validBody = {
      branch,
      modifyUserId: 4560,
      initDataUnsafe: {user: {id: 1230}}
    };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, 1230));
    removeUserPermission.mockResolvedValue({matchedCount: 1});
  });

  beforeEach(() => {
    validateInitData.mockClear();
    getUser.mockClear();
    removeUserPermission.mockClear();
  });


  describe('INVALID PARAMETERS POST /api/removeUser', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {modifyUserId: 4560, initDataUnsafe: {user: {id: 1230}}},
        {branch, initDataUnsafe: {user: {id: 1230}}},
        {branch, modifyUserId: 4560},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/removeUser').send(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });


  describe('VALID PARAMETERS POST /api/removeUser', () => {
    it('should return status code 200', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(200);
    });


    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(401);
    });


    it('should respond with status code 403 if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(403);
    });


    it('should respond with status code 404 if user to modify is not found', async () => {
      removeUserPermission.mockResolvedValueOnce({matchedCount: 0});
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(404);
    });


    it('should call isRotaAdmin() once', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });


    it('should call removeUserPermission() once', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(removeUserPermission).toHaveBeenCalledTimes(1);
      expect(removeUserPermission).toHaveBeenCalledWith(branch, 4560);
    });


    it('should not call removeUserPermission() if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(removeUserPermission).toHaveBeenCalledTimes(0);
    });
  });
});