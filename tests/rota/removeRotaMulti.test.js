// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import { addDays } from 'date-fns';
import request from 'supertest';
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn()
}));
const { verifyToken } = await import('../../src/utils/jwt.js');
const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const removeUserFromRotaMulti = jest.fn();

const app = makeApp({
  getUser,
  removeUserFromRotaMulti
});

const apiUrl = '/api/removeRotaMulti';
const callerId = 1230;
const mockUser = { id: callerId, username: 'test_user' };
const authToken = 'Bearer valid-token';
const branch = 'lns';
const startDate = new Date();
const endDate = addDays(startDate, 30);
const timeRanges = ['00:00-01:00', '23:00-24:00'];
const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
const userId = 4560;

const validBody = {
  branch,
  startDate,
  endDate,
  timeRanges,
  daysOfWeek,
  userId
};

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    verifyToken.mockReturnValue(mockUser);
    removeUserFromRotaMulti.mockResolvedValue({
      matchedCout: 5,
      modifiedCount: 5
    });
    getUser.mockResolvedValue(generateAdmin(branch, callerId));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`Authentication POST ${apiUrl}`, () => {
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
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it.each([
      { startDate, endDate, timeRanges, daysOfWeek, userId },
      { branch, endDate, timeRanges, daysOfWeek, userId },
      { branch, startDate, timeRanges, daysOfWeek, userId },
      { branch, startDate, endDate, daysOfWeek, userId },
      { branch, startDate, endDate, timeRanges, userId },
      { branch, startDate, endDate, timeRanges, daysOfWeek },
      {},
      undefined,
      null
    ])('should respond with status code 400 for incomplete body %j', async body => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(body);
      expect(res.statusCode).toBe(400);
    });

    it('should respond with status code 400 when startDate is larger than endDate', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send({ ...validBody, endDate: startDate, startDate: endDate });
      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 200', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with status code 403 if non admin calls the endpoint', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, callerId));
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 403 if unable to find admin user', async () => {
      getUser.mockResolvedValueOnce(null);
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should call `getUser` once', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(callerId);
    });

    it('should call `removeUserFromRotaMulti`', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);
      expect(removeUserFromRotaMulti).toHaveBeenCalledTimes(1);
      expect(removeUserFromRotaMulti).toHaveBeenCalledWith({
        branch,
        userId,
        startDate,
        endDate,
        daysOfWeek,
        hours: [0, 23]
      });
    });
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
    it('response should be an object', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(typeof res.body === 'object' && res.body !== null).toBe(true);
    });

    it('response object should have property "modifiedCount"', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      const expectedProps = new Set(['modifiedCount']);
      const actualProps = new Set(Object.keys(res.body));
      expect(actualProps).toEqual(expectedProps);
    });
  });
});
