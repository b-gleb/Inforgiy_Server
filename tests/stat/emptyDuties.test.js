// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import request from 'supertest';
import { departmentStatisticsSchema } from '../../schemas/departmentStatistics.schema.js';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateEmptyDutiesStats } from '../generators.js';

const makeApp = (await import('../../src/app.js')).default;

const getEmptyDuties = jest.fn();

const app = makeApp({
  getEmptyDuties
});

const apiUrl = '/api/stats/emptyDuties';
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

describe(`POST ${apiUrl}`, () => {
  let branch;
  let dateRanges;
  let validBody;
  let variableLengthBodyOptions;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    dateRanges = [
      ['2025-01-01', '2025-01-31'],
      ['2025-02-01', '2025-02-28']
    ];
    validBody = { branch, dateRanges };
    variableLengthBodyOptions = [
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

    getEmptyDuties.mockResolvedValue(generateEmptyDutiesStats(dateRanges));
  });

  beforeEach(() => {
    getEmptyDuties.mockClear();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([
      { branch },
      { dateRanges },
      {}
    ])('should respond with status code 400 for incomplete body: %j', async body => {
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
      getEmptyDuties.mockResolvedValue(generateEmptyDutiesStats(dateRanges, count));
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

    it('length of array should be the length of requested dateRanges', async () => {
      for (const body of variableLengthBodyOptions) {
        getEmptyDuties.mockClear();
        getEmptyDuties.mockResolvedValueOnce(
          generateEmptyDutiesStats(body.dateRanges, count)
        );

        const res = await request(app).post(apiUrl).send(body);
        expect(res.body.length).toBe(body.dateRanges.length);
      }
    });
  });

  describe('Business Logic', () => {
    it('should call `getEmptyDuties` once', async () => {
      for (const body of variableLengthBodyOptions) {
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
});
