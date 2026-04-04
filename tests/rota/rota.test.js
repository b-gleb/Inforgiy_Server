import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import { lastDayOfYear, format } from 'date-fns';
import settup from '../../src/config/settup.json' with { type: 'json' };

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
    branch = Object.keys(settup)[0];
    date = format(lastDayOfYear(new Date()), 'yyyy-MM-dd');
    validBody = { branch, date };

    getRota.mockResolvedValue({});
  });

  beforeEach(() => {
    getRota.mockClear();
  });

  describe(`INVALID PARAMETERS GET ${apiUrl}`, () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      // prettier-ignore
      const bodyData = [
        { branch },
        { date },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).get(apiUrl).query(body);
        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe(`VALID PARAMETERS GET ${apiUrl}`, () => {
    it('should respond with a status code of 200', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with a status code of 404 if date is not found', async () => {
      getRota.mockResolvedValueOnce(null);
      const res = await request(app).get(apiUrl).query({
        branch,
        date: '1990-01-01'
      });

      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(res.headers['content-type']).toEqual(
        expect.stringContaining('json')
      );
    });

    it('should query the database for day rota', async () => {
      const res = await request(app).get(apiUrl).query(validBody);
      expect(getRota).toHaveBeenCalledTimes(1);
      expect(getRota).toHaveBeenCalledWith(branch, new Date(date));
    });
  });

  describe.each(Object.keys(settup))(
    `RESPONSE VALIDATION GET ${apiUrl} for branch %s`,
    iterateBranch => {
      it('response should be an array of length 24', async () => {
        const res = await request(app)
          .get(apiUrl)
          .query({ ...validBody, branch: iterateBranch });
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body).toHaveLength(24);
      });

      it('array elements should have properties "users" and "label"', async () => {
        const res = await request(app)
          .get(apiUrl)
          .query({ ...validBody, branch: iterateBranch });

        const expectedProps = ['users', 'label'].sort();
        const allHaveExpectedProps = res.body.every(item => {
          const actualProps = Object.keys(item).sort();
          return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
        });

        expect(allHaveExpectedProps).toBe(true);
      });

      it('array element "users" should be of type object', async () => {
        const res = await request(app)
          .get(apiUrl)
          .query({ ...validBody, branch: iterateBranch });
        expect(
          res.body.every(
            item => typeof item.users === 'object' && item.users != null
          )
        ).toBe(true);
      });

      it('array element property "label" should be of type string', async () => {
        const res = await request(app)
          .get(apiUrl)
          .query({ ...validBody, branch: iterateBranch });
        expect(res.body.every(item => typeof item.label === 'string')).toBe(
          true
        );
      });
    }
  );
});
