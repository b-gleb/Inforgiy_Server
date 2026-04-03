import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateUser, generateAdmin } from '../generators.js';

jest.unstable_mockModule('../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import(
  '../../src/utils/initDataValidation.js'
);

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
  describe('INVALID PARAMETERS POST ${apiUrl}', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        { branch: Object.keys(settup)[0] },
        { initDataUnsafe: { user: { id: 1230 } } },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post(apiUrl).send(body);
        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    let branch;
    let validBody;

    beforeAll(() => {
      branch = Object.keys(settup)[0];
      validBody = { branch, initDataUnsafe: { user: { id: 1230 } } };

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
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
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

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(
        expect.stringContaining('json')
      );
    });

    it('should call isRotaAdmin() once', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });

    it('should call getUserCount() once', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(getUserCount).toHaveBeenCalledTimes(1);
      expect(getUserCount).toHaveBeenCalledWith(branch);
    });

    it('should not call getBranchUsers() when userCount matches cache', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(getBranchUsers).toHaveBeenCalledTimes(0);
    });

    it('should call getBranchUsers() once when userCount differs from cache', async () => {
      getUserCount.mockResolvedValueOnce(1);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(getBranchUsers).toHaveBeenCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch);
    });
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
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

    it('response should be an array of objects', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(
        res.body.every(item => typeof item === 'object' && item != null)
      ).toBe(true);
    });

    it('response object should only have properties: "id", "username", "nick", "color"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['id', 'username', 'nick', 'color'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return (
          JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort())
        );
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('response object property "id" should be an integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => Number.isInteger(item.id))).toBe(true);
    });

    it('response object property "username" should be a string beginning with @', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        res.body.every(
          item =>
            typeof item.username === 'string' && item.username.startsWith('@')
        )
      ).toBe(true);
    });

    it('response object property "nick" should be a string', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => typeof item.nick === 'string')).toBe(true);
    });

    it('response object property "color" should be an integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => Number.isInteger(item.color))).toBe(true);
    });
  });
});
