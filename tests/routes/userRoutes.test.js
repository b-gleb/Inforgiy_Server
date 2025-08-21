import { beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
const makeApp = (await import('../../src/app.js')).default;

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
  // beforeEach(() => {
  //   .mockReset();
  // });

  describe('INVALID PARAMETERS GET /api/users', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        {branch: Object.keys(settup)[0]},
        {initDataUnsafe: {}},
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).get('/api/users').query(body);
        expect(res.statusCode).toBe(400);
      };
    });
  });


  // describe('VALID PARAMETERS GET /api/users', () => {
    // should respond with status code 200

    // should respond with status code 401 if unable to verify hash

    // should respond with status code 403 if non admin user requests operation

    // should specify json in the content type header

    // should call isRotaAdmin() once

    // should call getUserCount() once

    // should call getBranchUsers() once if userCount does not match cache
  // });


  // describe('RESPONSE VALIDATION GET /api/users', () => {
    // response should be an array of objects

    // response object should only have properties: "id", "username", "nick", "color"

    // response object property "id" should be an integer

    // respons object property "username" should be a string beginning with @

    // response object property "nick" should be a string

    // response object property "color" should be an integer
  // });
});