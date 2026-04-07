import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateEmptyDutiesStats } from '../generators.js';

const makeApp = (await import('../../src/app.js')).default;

const getEmptyDuties = jest.fn();

const app = makeApp({
  getEmptyDuties
});

const apiUrl = '/api/stats/emptyDuties';

describe(`POST ${apiUrl}`, () => {
  let branch;
  let dateRanges;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    dateRanges = [
      ['2025-01-01', '2025-01-31'],
      ['2025-02-01', '2025-02-28']
    ];
    validBody = { branch, dateRanges };

    getEmptyDuties.mockResolvedValue(generateEmptyDutiesStats(dateRanges));
  });

  beforeEach(() => {
    getEmptyDuties.mockClear();
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      // biome-ignore format: keep test cases on separate lines
      const bodyData = [
        { branch },
        { dateRanges },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post(apiUrl).send(body);
        expect(res.statusCode).toBe(400);
      }
    });

    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app)
        .post(apiUrl)
        .send({ branch, dateRanges: ['2025-01-01', '2025-01-31'] });
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

    it('should call `getEmptyDuties` once', async () => {
      const bodyData = [
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

      for (const body of bodyData) {
        getEmptyDuties.mockClear();
        getEmptyDuties.mockResolvedValueOnce(generateEmptyDutiesStats(body.dateRanges));

        const _res = await request(app).post(apiUrl).send(body);

        const expectedDateRanges = body.dateRanges.map(([start, end]) => [
          new Date(start),
          new Date(end)
        ]);

        expect(getEmptyDuties).toHaveBeenCalledTimes(1);
        expect(getEmptyDuties).toHaveBeenCalledWith(body.branch, expectedDateRanges);
      }
    });
  });

  // count = undefined: a non empty pipeline output
  // count = 0: no documents returned by the pipeline
  describe.each([
    undefined,
    0
  ])(`RESPONSE VALIDATION POST ${apiUrl}, count is %s`, count => {
    beforeAll(() => {
      getEmptyDuties.mockResolvedValue(generateEmptyDutiesStats(dateRanges, count));
    });

    it('should return an array of objects', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every(item => typeof item === 'object' && item !== null)).toBe(
        true
      );
    });

    it('length of array should be the length of requested dateRanges', async () => {
      const bodyData = [
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

      for (const body of bodyData) {
        getEmptyDuties.mockClear();
        getEmptyDuties.mockResolvedValueOnce(
          generateEmptyDutiesStats(body.dateRanges, count)
        );

        const res = await request(app).post(apiUrl).send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      }
    });

    it('array elements should have properties "dateRange" and "count"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['dateRange', 'count'].sort();
      const allHaveExpectedProps = res.body.every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('"dateRange" should be an array of length 2', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      expect(
        res.body.every(
          item => Array.isArray(item.dateRange) && item.dateRange.length === 2
        )
      ).toBe(true);
    });

    it('"dateRange" elements should be date strings', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const allDatesMatchFormat = res.body.every(item =>
        item.dateRange.every(range => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(range))
      );

      expect(
        res.body.every(item => item.dateRange.every(range => typeof range === 'string'))
      ).toBe(true);
      expect(allDatesMatchFormat).toBe(true);
    });

    it('"count" should be an integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.body.every(item => Number.isInteger(item.count))).toBe(true);
    });
  });
});
