import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateDateRangeStats, generateUser } from '../generators.js';

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const getDateRangeStats = jest.fn();

const app = makeApp({
  getUser,
  getDateRangeStats
});

const apiUrl = '/api/stats';

describe(`POST ${apiUrl}`, () => {
  let branch;
  let userIds;
  let dateRanges;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    userIds = [1230, 4560];
    dateRanges = [
      ['2025-01-01', '2025-01-31'],
      ['2025-02-01', '2025-02-28']
    ];
    validBody = { branch, userIds, dateRanges };

    getUser.mockResolvedValue(generateUser(branch, 1230));
    getDateRangeStats.mockResolvedValue(generateDateRangeStats(userIds));
  });

  beforeEach(() => {
    getDateRangeStats.mockClear();
    getUser.mockClear();
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        { userIds, dateRanges },
        { branch, dateRanges },
        { branch, userIds },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post(apiUrl).send(body);
        expect(res.statusCode).toBe(400);
      }
    });

    it('should respond with status code 400 if userIds is a valid id (not array of ids)', async () => {
      const res = await request(app)
        .post(apiUrl)
        .send({ branch, userIds: 1230, dateRanges });

      expect(res.statusCode).toBe(400);
    });

    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app)
        .post(apiUrl)
        .send({ branch, userIds, dateRanges: ['2025-01-01', '2025-01-31'] });

      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should return status code 200', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should return status code 404 when requested user does not exist', async () => {
      getUser.mockResolvedValueOnce(null);
      getDateRangeStats.mockResolvedValueOnce([]);

      const res = await request(app)
        .post(apiUrl)
        .send({ branch, userIds: [1], dateRanges });
      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(
        expect.stringContaining('json')
      );
    });

    it('should call function `getDateRangeStats` the same number of times as length of "dateRanges"', async () => {
      const bodyData = [
        { branch, userIds, dateRanges: [['2025-01-01', '2025-01-31']] },
        {
          branch,
          userIds,
          dateRanges: [
            ['2025-01-01', '2025-01-31'],
            ['2025-02-01', '2025-02-28']
          ]
        },
        {
          branch,
          userIds,
          dateRanges: [
            ['2025-01-01', '2025-01-31'],
            ['2025-02-01', '2025-02-28'],
            ['2025-03-01', '2025-03-31']
          ]
        }
      ];

      for (const body of bodyData) {
        getUser.mockClear();
        getDateRangeStats.mockClear();

        getUser.mockResolvedValueOnce(generateUser(branch, 1230));
        getDateRangeStats.mockResolvedValueOnce(
          generateDateRangeStats(userIds)
        );

        const _res = await request(app).post(apiUrl).send(body);

        expect(getDateRangeStats).toHaveBeenCalledTimes(body.dateRanges.length);
        expect(getDateRangeStats.mock.calls[0][0]).toBe(branch);
        expect(getDateRangeStats.mock.calls[0][1]).toStrictEqual(userIds);
      }
    });
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
    it('should return an array of objects', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(
        res.body.every(item => typeof item === 'object' && item !== null)
      ).toBe(true);
    });

    it('length of array should be the length of requested `userIds`', async () => {
      const bodyData = [
        { branch, dateRanges, userIds: [1230] },
        { branch, dateRanges, userIds: [1230, 4560] },
        { branch, dateRanges, userIds: [1230, 4560, 7890] }
      ];

      for (const body of bodyData) {
        getDateRangeStats.mockResolvedValue(
          generateDateRangeStats(body.userIds)
        );
        const res = await request(app).post(apiUrl).send(body);
        expect(res.body.length).toBe(body.userIds.length);
      }
    });

    it('array elements should have properties "user" and "data"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['user', 'data'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('array element "user" should be of type object', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        res.body.every(
          item => typeof item.user === 'object' && item.user != null
        )
      ).toBe(true);
    });

    it('array element "user" should have properties "id", "nick", "color"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['id', 'nick', 'color'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item.user).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('property "id" of object "user" object should be of a positive integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        res.body.every(
          item => Number.isInteger(item.user.id) && item.user.id > 0
        )
      ).toBe(true);
    });

    it('property "nick" of object "user" object should be a string', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => typeof item.user.nick === 'string')).toBe(
        true
      );
    });

    it('property "color" of object "user" object should be a positive integer or zero', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        res.body.every(
          item => Number.isInteger(item.user.color) && item.user.color >= 0
        )
      ).toBe(true);
    });

    it('array element "data" should be of type array', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => Array.isArray(item.data))).toBe(true);
    });

    it('array element "data" should have be the length of requested `dataRanges`', async () => {
      const bodyData = [
        { branch, userIds, dateRanges: [['2025-01-01', '2025-01-31']] },
        {
          branch,
          userIds,
          dateRanges: [
            ['2025-01-01', '2025-01-31'],
            ['2025-02-01', '2025-02-28']
          ]
        },
        {
          branch,
          userIds,
          dateRanges: [
            ['2025-01-01', '2025-01-31'],
            ['2025-02-01', '2025-02-28'],
            ['2025-03-01', '2025-03-31']
          ]
        }
      ];

      for (const body of bodyData) {
        const res = await request(app).post(apiUrl).send(body);
        expect(
          res.body.every(item => item.data.length === body.dateRanges.length)
        );
      }
    });

    it('"data" array element should be of type object', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      expect(
        res.body.every(item =>
          item.data.every(
            subitem => typeof subitem === 'object' && subitem != null
          )
        )
      ).toBe(true);
    });

    it('"data" array element should have properties "dateRange" and "count"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['dateRange', 'count'].sort();
      const allHaveExpectedProps = res.body.every(item =>
        item.data.every(subitem => {
          const actualProps = Object.keys(subitem).sort();
          return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
        })
      );

      expect(allHaveExpectedProps).toBe(true);
    });

    it('"dateRange" property to be of type array of length 2', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      expect(
        res.body.every(item =>
          item.data.every(
            subitem =>
              Array.isArray(subitem.dateRange) && subitem.dateRange.length === 2
          )
        )
      ).toBe(true);
    });

    it('"dateRange" elements should be date strings', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        item.data.every(subitem =>
          subitem.dateRange.every(range =>
            /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(range)
          )
        )
      );

      expect(
        res.body.every(item =>
          item.data.every(subitem =>
            subitem.dateRange.every(range => typeof range === 'string')
          )
        )
      ).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });

    it('"count" property to be of type integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      expect(
        res.body.every(item =>
          item.data.every(
            subitem =>
              typeof Number.isInteger(subitem.count) && subitem.count >= 0
          )
        )
      ).toBe(true);
    });
  });
});
