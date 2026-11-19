// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import { format, lastDayOfYear } from 'date-fns';
import request from 'supertest';
import { rotaSchema } from '../../schemas/rota.schema.js';

const makeApp = (await import('../../src/app.js')).default;
const getRota = jest.fn();

const app = makeApp({
  getRota
});

const apiUrl = '/api/rota';

describe(`GET ${apiUrl}`, () => {
  let branch;
  let date;
  let validBody;

  beforeAll(() => {
    branch = 'lns';
    date = format(lastDayOfYear(new Date()), 'yyyy-MM-dd');
    validBody = { branch, date };

    getRota.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation, Authentication, Authorization', () => {
    // biome-ignore format: keep each `it` block separate
    it.each([
      { branch },
      { date },
      {}
    ])('should respond with a status code 400 with incomplete query: %j', async body => {
      const res = await request(app).get(apiUrl).query(body);
      expect(res.statusCode).toBe(400);
    });

    it('should respond with a status code of 404 if date is not found', async () => {
      getRota.mockResolvedValueOnce(null);
      const res = await request(app).get(apiUrl).query({
        branch,
        date: '1990-01-01'
      });

      expect(res.statusCode).toBe(404);
    });

    it('should respond with a status code of 500 if DB call fails', async () => {
      // suppress console.error output
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      getRota.mockRejectedValueOnce(new Error('DB exception occured'));
      const res = await request(app).get(apiUrl).query(validBody);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: 'Internal server error'
      });

      errorSpy.mockRestore();
    });
  });

  describe('Response Validation', () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching an array of userSchema', async () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validSchema = ajv.compile(rotaSchema);

      const res = await request(app).get(apiUrl).query(validBody);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }

      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should query the database for day rota', async () => {
      await request(app).get(apiUrl).query(validBody);
      expect(getRota).toHaveBeenCalledTimes(1);
      expect(getRota).toHaveBeenCalledWith(branch, new Date(date));
    });
  });
});
