import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import { rotaDBEntry } from './mocks.js';
import settup from '../../src/config/settup.json' with { type: 'json' };

const makeApp = (await import('../../src/app.js')).default;
const getUserDuties = jest.fn();

const app = makeApp({
  getUserDuties
});

const apiUrl = '/api/userDuties';

describe(`GET ${apiUrl}`, () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    validBody = {
      branch,
      userId: 1813610409,
      startDate: '2025-01-01',
      endDate: '2025-01-08'
    };

    getUserDuties.mockResolvedValue([rotaDBEntry]);
  });

  beforeEach(() => {
    getUserDuties.mockClear();
  });

  describe(`INVALID PARAMETRS GET ${apiUrl}`, () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        { userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08' },
        { branch, startDate: '2025-01-01', endDate: '2025-01-08' },
        { branch, userId: 1230, endDate: '2025-01-08' },
        { branch, userId: 1230, startDate: '2025-01-01' },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).get(apiUrl).query(body);
        expect(res.statusCode).toBe(400);
      }
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
      expect(res.headers['content-type']).toEqual(
        expect.stringContaining('json')
      );
    });

    it('should query the database for user duties', async () => {
      const _res = await request(app).get(apiUrl).query(validBody);

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

      const expectedProps = ['date', 'hours'];
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return (
          JSON.stringify(actualProps) === JSON.stringify(expectedProps.sort())
        );
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('array element property "date" should be of type date', async () => {
      const res = await request(app).get(apiUrl).query(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(item.date)
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
