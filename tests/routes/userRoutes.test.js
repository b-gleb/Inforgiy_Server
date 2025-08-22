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
    beforeEach(() => {
      validateInitData.mockReset();
      getUser.mockReset();
      getUserCount.mockReset();
      getBranchUsers.mockReset();
    });

    it('should respond with status code 200', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(0);
      getBranchUsers.mockResolvedValue([]);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});
      
      expect(res.statusCode).toBe(200);
    });


    it('should respond with status code 401 if unable to verify hash', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(false);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});

      expect(res.statusCode).toBe(401);
    });


    it('should respond with status code 403 if non admin user requests operation', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateUser(branch, 1230));

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});

      expect(res.statusCode).toBe(403);
    });


    it('should specify json in the content type header', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(0);
      getBranchUsers.mockResolvedValue([]);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});

      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });


    it('should call isRotaAdmin() once', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(0);
      getBranchUsers.mockResolvedValue([]);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});

      expect(getUser.mock.calls.length).toBe(1);
      expect(getUser.mock.calls[0][0]).toBe(1230);
    });


    it('should call getUserCount() once', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(0);
      getBranchUsers.mockResolvedValue([]);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});
      
      expect(getUserCount.mock.calls.length).toBe(1);
      expect(getUserCount.mock.calls[0][0]).toBe(branch);
    });


    it('should not call getBranchUsers() when userCount matches cache', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(0);
      getBranchUsers.mockResolvedValue([]);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});

      expect(getBranchUsers.mock.calls.length).toBe(0);
    });


    it('should call getBranchUsers() once when userCount differs from cache', async () => {
      const branch = Object.keys(settup)[0];
      validateInitData.mockReturnValue(true);
      getUser.mockResolvedValue(generateAdmin(branch, 1230));
      getUserCount.mockResolvedValue(1);
      getBranchUsers.mockResolvedValue([]);

      const res = await request(app).get('/api/users').query({branch, initDataUnsafe: {user: {id: 1230}}});

      expect(getBranchUsers.mock.calls.length).toBe(1);
      expect(getBranchUsers.mock.calls[0][0]).toBe(branch);
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