// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import { generateCumulativeStats } from '../generators.js';

const makeApp = (await import('../../src/app.js')).default;

const getCumulativeStats = jest.fn();

const app = makeApp({
  getCumulativeStats
});

const apiUrl = '/api/stats/cumulative';
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

const branch = 'lns';
const userId = 1230;
const dateRanges = [
  ['2025-01-01', '2025-01-31'],
  ['2025-02-01', '2025-02-28']
];
const validBody = { branch, userId, dateRanges };
const variableLengthBodyOptions = [
  { ...validBody, dateRanges: [['2025-01-01', '2025-01-31']] },
  {
    ...validBody,
    dateRanges: [
      ['2025-01-01', '2025-01-31'],
      ['2025-02-01', '2025-02-28']
    ]
  },
  {
    ...validBody,
    dateRanges: [
      ['2025-01-01', '2025-01-31'],
      ['2025-02-01', '2025-02-28'],
      ['2025-03-01', '2025-03-31']
    ]
  }
];

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    getCumulativeStats.mockResolvedValue(generateCumulativeStats(dateRanges));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    // biome-ignore format: keep each `it` block separate
    it.each([
      { userId, dateRanges },
      { branch, dateRanges },
      { branch, userId },
      {}
    ])('should respond with status code 400 if any of the parameters are missing', async body => {
      const res = await request(app).post(apiUrl).send(body);
      expect(res.statusCode).toBe(400);
    });

    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app)
        .post(apiUrl)
        .send({ ...validBody, dateRanges: ['2025-01-01', '2025-01-31'] });
      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should return status code 200', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it.each(variableLengthBodyOptions)(
      'should call getcumulativeStats() once',
      async body => {
        await request(app).post(apiUrl).send(body);

        const expectedDateRanges = body.dateRanges.map(([start, end]) => [
          new Date(start),
          new Date(end)
        ]);

        expect(getCumulativeStats).toHaveBeenCalledTimes(1);
        expect(getCumulativeStats).toHaveBeenCalledWith(
          branch,
          body.userId,
          expectedDateRanges
        );
      }
    );
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
    it('should return an array of objects', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item !== null)).toBe(
        true
      );
    });

    it.each(variableLengthBodyOptions)(
      'length of the array should be equal to length of "dateRanges"',
      async body => {
        getCumulativeStats.mockResolvedValueOnce(
          generateCumulativeStats(body.dateRanges)
        );

        const res = await request(app).post(apiUrl).send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      }
    );

    it('array object should have properties "userId", "dateRange" and "data"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['userId', 'dateRange', 'data'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('property "userId" should be of type integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => Number.isInteger(item.userId))).toBe(true);
    });

    it('property "dateRange" should be of type array of length 2', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        res.body.every(
          item => Array.isArray(item.dateRange) && item.dateRange.length === 2
        )
      ).toBe(true);
    });

    it('property "dateRange" elements should be date strings', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        item.dateRange.every(range => DATE_FORMAT_REGEX.test(range))
      );

      expect(
        res.body.every(item => item.dateRange.every(range => typeof range === 'string'))
      ).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });

    it('property "data" should be an array of objects', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => typeof item.data === 'object' && item.data !== null));
    });

    it('elements of "data" array should have properties "date", "count"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['date', 'count'].sort();
      const allHaveExpectedProps = res.body.every(item =>
        item.data.every(subitem => {
          const actualProps = Object.keys(subitem).sort();
          return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
        })
      );

      expect(allHaveExpectedProps).toBe(true);
    });

    it('property "date" should be a date string', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        item.data.every(entry => DATE_FORMAT_REGEX.test(entry.date))
      );

      expect(
        res.body.every(item => item.data.every(entry => typeof entry.date === 'string'))
      ).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });

    it('property "count" should be a positive integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        res.body.every(item =>
          item.data.every(subitem => Number.isInteger(subitem.count))
        )
      ).toBe(true);
    });
  });
});
