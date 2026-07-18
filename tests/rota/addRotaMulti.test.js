// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import { addDays } from 'date-fns';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');
const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const addUserToRotaMulti = jest.fn();

const app = makeApp({
  getUser,
  addUserToRotaMulti
});

const apiUrl = '/api/addRotaMulti';

describe(`POST ${apiUrl}`, () => {
  let branch;
  let startDate;
  let endDate;
  let validBody;
  let timeRanges;
  let daysOfWeek;
  let userId;
  let initDataUnsafe;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    startDate = new Date();
    endDate = addDays(startDate, 30);
    timeRanges = ['00:00-01:00', '23:00-24:00'];
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    userId = 4560;
    initDataUnsafe = { user: { id: 1230 } };

    validBody = {
      branch,
      startDate,
      endDate,
      timeRanges,
      daysOfWeek,
      userId,
      initDataUnsafe
    };

    validateInitData.mockReturnValue(true);
    addUserToRotaMulti.mockResolvedValue({ matchedCout: 5, modifiedCount: 5 });
  });

  beforeEach(() => {
    validateInitData.mockClear();
    getUser.mockReset();
    addUserToRotaMulti.mockClear();
    getUser
      .mockResolvedValueOnce(generateAdmin(Object.keys(settup)[0], 1230))
      .mockResolvedValueOnce(generateUser(Object.keys(settup)[0], 4560));
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 400 when any of the parameters are missing', async () => {
      const bodyData = [
        { startDate, endDate, timeRanges, daysOfWeek, userId, initDataUnsafe },
        { branch, endDate, timeRanges, daysOfWeek, userId, initDataUnsafe },
        { branch, startDate, timeRanges, daysOfWeek, userId, initDataUnsafe },
        { branch, startDate, endDate, daysOfWeek, userId, initDataUnsafe },
        { branch, startDate, endDate, timeRanges, userId, initDataUnsafe },
        { branch, startDate, endDate, timeRanges, daysOfWeek, initDataUnsafe },
        { branch, startDate, endDate, timeRanges, daysOfWeek, userId },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post(apiUrl).send(body);
        expect(res.statusCode).toBe(400);
      }
    });

    it('should respond with status code 400 when startDate is larger than endDate', async () => {
      const res = await request(app)
        .post(apiUrl)
        .send({ ...validBody, endDate: startDate, startDate: endDate });
      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if non admin calls the endpoint', async () => {
      getUser.mockReset();
      getUser
        .mockResolvedValueOnce(generateUser(Object.keys(settup)[0], 1230))
        .mockResolvedValueOnce(generateUser(Object.keys(settup)[0], 4560));
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 403 if unable to find admin user', async () => {
      getUser.mockReset();
      getUser.mockResolvedValueOnce(null);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 404 if unable to find user', async () => {
      getUser.mockReset();
      getUser
        .mockResolvedValueOnce(generateAdmin(Object.keys(settup)[0], 1230))
        .mockResolvedValueOnce(null);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should call `getUser` once if non admin calls the endpoint', async () => {
      getUser.mockReset();
      getUser
        .mockResolvedValueOnce(generateUser(Object.keys(settup)[0], 1230))
        .mockResolvedValueOnce(generateUser(Object.keys(settup)[0], 4560));

      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });

    it('should call `getUser` twice (to check calling user and the user to add to rota)', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(2);
      expect(getUser).toHaveBeenNthCalledWith(1, 1230);
      expect(getUser).toHaveBeenLastCalledWith(4560);
    });

    it('should call `addUserToRotaMulti`', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(addUserToRotaMulti).toHaveBeenCalledTimes(1);
      expect(addUserToRotaMulti).toHaveBeenCalledWith({
        branch,
        userId,
        startDate,
        endDate,
        daysOfWeek,
        hours: [0, 23],
        allowOccupiedSlots: true
      });
    });
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
    it('response should be an object', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(typeof res.body === 'object' && res.body !== null).toBe(true);
    });

    it('response object should have property "modifiedCount"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      const expectedProps = ['modifiedCount'].sort();
      const actualProps = Object.keys(res.body).sort();
      expect(JSON.stringify(actualProps) === JSON.stringify(expectedProps)).toBe(true);
    });
  });
});
