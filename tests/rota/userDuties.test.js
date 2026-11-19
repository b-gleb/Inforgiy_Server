// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import { rotaDBEntry } from './mocks.js';

const makeApp = (await import('../../src/app.js')).default;
const getUserDuties = jest.fn();

const app = makeApp({
  getUserDuties
});

const apiUrl = '/api/userDuties';
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

describe(`GET ${apiUrl}`, () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = 'lns';
    validBody = {
      branch,
      userId: 1813610409,
      startDate: '2025-01-01',
      endDate: '2025-01-08'
    };

    getUserDuties.mockResolvedValue([rotaDBEntry]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`INVALID PARAMETRS GET ${apiUrl}`, () => {
    it.each([
      { userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08' },
      { branch, startDate: '2025-01-01', endDate: '2025-01-08' },
      { branch, userId: 1230, endDate: '2025-01-08' },
      { branch, userId: 1230, startDate: '2025-01-01' },
      {}
    ])('should respond with a status code 400 for missing parameter: %#', async body => {
      const res = await request(app).get(apiUrl).query(body);
      expect(res.statusCode).toBe(400);
    });

    it('should respond with a status code 400 when startDate is larger than endDate', async () => {
      const res = await request(app)
        .get(apiUrl)
        .query({
          ...validBody,
          startDate: '2025-01-08',
          endDate: '2025-01-01'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS GET ${apiUrl}`, () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should query the database for user duties', async () => {
      await request(app).get(apiUrl).query(validBody);

      expect(getUserDuties).toHaveBeenCalledTimes(1);
      expect(getUserDuties).toHaveBeenCalledWith(
        validBody.branch,
        validBody.userId,
        new Date(validBody.startDate),
        new Date(validBody.endDate)
      );
    });
  });

  describe(`RESPONSE VALIDATION GET ${apiUrl}`, () => {
    it('should return an empty array if no duties are found', async () => {
      getUserDuties.mockResolvedValueOnce([]);
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });

    it('should return an array of objects if any duties are found', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.body.every(item => typeof item === 'object' && item != null));
    });

    it('array element should have properties "date" and "hours"', async () => {
      const res = await request(app).get(apiUrl).query(validBody);

      const expectedProps = new Set(['date', 'hours']);
      for (const item of res.body) {
        expect(new Set(Object.keys(item))).toEqual(expectedProps);
      }
    });

    it('array element property "date" should be of type date', async () => {
      const res = await request(app).get(apiUrl).query(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        DATE_FORMAT_REGEX.test(item.date)
      );

      expect(res.body.every(item => typeof item.date === 'string')).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });

    it('array element property "hours" should be of type array', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.body.every(item => Array.isArray(item.hours))).toBe(true);
    });

    it('array element property "hours" should not be empty', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.body.every(item => item.hours.length !== 0)).toBe(true);
    });

    it('array element property "hours" should contain integers', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(
        res.body.every(item => item.hours.every(hour => Number.isInteger(hour)))
      ).toBe(true);
    });
  });
});
