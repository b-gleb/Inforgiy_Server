// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import request from 'supertest';
import { departmentStatisticsSchema } from '../../schemas/departmentStatistics.schema.js';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateUniqueUsersStats } from '../generators.js';

const makeApp = (await import('../../src/app.js')).default;

const getUniqueUsers = jest.fn();

const app = makeApp({
  getUniqueUsers
});

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const apiUrl = '/api/stats/uniqueUsers';

const branch = Object.keys(settup)[0];
const dateRanges = [
  ['2025-01-01', '2025-01-31'],
  ['2025-02-01', '2025-02-28']
];
const validBody = { branch, dateRanges };
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
    getUniqueUsers.mockResolvedValue(generateUniqueUsersStats(dateRanges));
  });

  beforeEach(() => {
    getUniqueUsers.mockClear();
  });

  describe('Validation, Authentication, Authorization', () => {
    // biome-ignore format: keep each `it` block separate
    it.each([
      { branch },
      { dateRanges },
      {}
    ])('should respond with status code 400 for incomplete body: %s', async body => {
      const res = await request(app).post(apiUrl).send(body);
      expect(res.statusCode).toBe(400);
    });

    it('should respond with status code 400 if dateRanges is a valid date range (not array of date ranges)', async () => {
      const res = await request(app)
        .post(apiUrl)
        .send({ branch, dateRanges: ['2025-01-01', '2025-01-31'] });
      expect(res.statusCode).toBe(400);
    });
  });

  // count = undefined: a non empty pipeline output
  // count = 0: no documents returned by the pipeline
  describe.each([undefined, 0])('Response Validation for count %s', count => {
    beforeAll(() => {
      getUniqueUsers.mockResolvedValue(generateUniqueUsersStats(dateRanges, count));
    });

    it('should return status code 200', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching departmentStatisticsSchema', async () => {
      const validSchema = ajv.compile(departmentStatisticsSchema);

      const res = await request(app).post(apiUrl).send(validBody);
      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }

      expect(valid).toBe(true);
    });

    it.each(variableLengthBodyOptions)(
      'length of array should be the length of requested dateRanges for: %#',
      async body => {
        getUniqueUsers.mockClear();
        getUniqueUsers.mockResolvedValueOnce(
          generateUniqueUsersStats(body.dateRanges, count)
        );

        const res = await request(app).post(apiUrl).send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      }
    );
  });

  describe('Business Logic', () => {
    it.each(variableLengthBodyOptions)(
      'should call `getUniqueUsers` once for : %#',
      async body => {
        getUniqueUsers.mockClear();
        getUniqueUsers.mockResolvedValueOnce(generateUniqueUsersStats(body.dateRanges));

        const _res = await request(app).post(apiUrl).send(body);

        const expectedDateRanges = body.dateRanges.map(([start, end]) => [
          new Date(start),
          new Date(end)
        ]);

        expect(getUniqueUsers).toHaveBeenCalledTimes(1);
        expect(getUniqueUsers).toHaveBeenCalledWith(body.branch, expectedDateRanges);
      }
    );
  });
});
