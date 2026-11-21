// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { departmentSchema } from '../../schemas/department.schema.js';
import cache from '../../src/utils/cache.js';

const makeApp = (await import('../../src/app.js')).default;
const getDepartments = jest.fn();

const app = makeApp({
  getDepartments
});

const ajv = new Ajv({ allErrors: true, strict: true });

const apiUrl = '/api/departments';

const departmentArray = [
  { slug: 'lns', name: 'ЛНС', maxDuties: 7 },
  { slug: 'di', name: 'ДИ', maxDuties: 3 }
];

describe(`GET ${apiUrl}`, () => {
  beforeAll(() => {
    getDepartments.mockResolvedValue(departmentArray);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cache.flushAll();
  });

  describe('Response Validation', () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).get(apiUrl);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).get(apiUrl);
      expect(res.header['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching an array of departmentSchema', async () => {
      const validSchema = ajv.compile({
        type: 'array',
        items: departmentSchema
      });
      const res = await request(app).get(apiUrl);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }

      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should call `getDepartments` once', async () => {
      await request(app).get(apiUrl);
      expect(getDepartments).toHaveBeenCalledTimes(1);
    });

    it('should pull from cache on second call, skipping database', async () => {
      await request(app).get(apiUrl);
      await request(app).get(apiUrl);

      expect(getDepartments).toHaveBeenCalledTimes(1);
    });

    it('should write all departments individually to cache', async () => {
      await request(app).get(apiUrl);

      expect(cache.get('get.department.lns')).toEqual(departmentArray[0]);
      expect(cache.get('get.department.di')).toEqual(departmentArray[1]);
    });
  });
});
