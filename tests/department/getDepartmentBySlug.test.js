// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { departmentSchema } from '../../schemas/department.schema.js';

const makeApp = (await import('../../src/app.js')).default;
const getDepartmentBySlug = jest.fn();

const app = makeApp({
  getDepartmentBySlug
});

const apiUrl = '/api/departments';
const ajv = new Ajv({ allErrors: true, strict: true });

const department = {
  slug: 'lns',
  name: 'ЛНС',
  maxDuties: 7
};

describe(`GET ${apiUrl}/{slug}`, () => {
  beforeAll(() => {
    getDepartmentBySlug.mockResolvedValue(department);
  });

  beforeEach(() => {
    getDepartmentBySlug.mockClear();
  });

  describe('Response Validation', () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).get(`${apiUrl}/lns`);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with status code 404 if department not found', async () => {
      getDepartmentBySlug.mockResolvedValueOnce(null);
      const res = await request(app).get(`${apiUrl}/not-found`);

      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).get(`${apiUrl}/lns`);
      expect(res.header['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching departmentSchema', async () => {
      const validSchema = ajv.compile(departmentSchema);
      const res = await request(app).get(`${apiUrl}/lns`);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }

      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should call `getDepartmentBySlug` once with correct arguments', async () => {
      await request(app).get(`${apiUrl}/lns`);

      expect(getDepartmentBySlug).toHaveBeenCalledTimes(1);
      expect(getDepartmentBySlug).toHaveBeenCalledWith('lns');
    });
  });
});
