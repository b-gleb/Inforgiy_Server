// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');
const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();

const app = makeApp({
  getUser
});

const apiUrl = '/api/auth';

const initDataUnsafe = { user: { id: 1230 } };
const validBody = { initDataUnsafe };
const userData = generateUser('lns', 1230);

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateUser(Object.keys(settup)[0], 1230));
  });

  beforeEach(() => {
    validateInitData.mockClear();
    getUser.mockClear();
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const res = await request(app).post(apiUrl).send({});
      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    it('should respond with status code 200', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if user has no roles', async () => {
      getUser.mockResolvedValueOnce({
        telegram: '@username_1230',
        roles: {}
      });

      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 404 if user is not found', async () => {
      getUser.mockResolvedValueOnce(null);
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(404);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should call `validateInitData` once', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(validateInitData).toHaveBeenCalledTimes(1);
    });

    it('should call `getUser` once', async () => {
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(initDataUnsafe.user.id);
    });

    it('should not call `getUser` if `validateInitData` failed', async () => {
      validateInitData.mockReturnValueOnce(false);
      const _res = await request(app).post(apiUrl).send(validBody);
      expect(validateInitData).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledTimes(0);
    });
  });

  describe(`RESPONSE VALIDATION POST ${apiUrl}`, () => {
    it('should return an object', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(typeof res.body === 'object' && res.body !== null).toBe(true);
    });

    it('response object should have properties "branches", "rotaAdmin"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      const expectedProps = ['branches', 'rotaAdmin'].sort();
      const actualProps = Object.keys(res.body).sort();

      expect(JSON.stringify(actualProps) === JSON.stringify(expectedProps)).toBe(true);
    });

    it.each([
      {
        telegram: '@username',
        roles: { rota_lns: userData }
      },
      {
        telegram: '@username',
        roles: { rota_lns: userData, rota_di: userData }
      },
      {
        telegram: '@username',
        roles: { rota_lns: userData, rota_di: userData, rota_gp: userData }
      }
    ])('property "branches" should be an object of length equal to number of branches with access', async permission => {
      getUser.mockClear();
      getUser.mockResolvedValueOnce(permission);

      const res = await request(app).post(apiUrl).send(validBody);
      expect(typeof res.body.branches === 'object' && res.body.branches !== null).toBe(
        true
      );
      expect(res.body.branches.length === permission.roles.length);
    });

    it('subobject of "branches" should have properties "color" and "maxDuties"', async () => {
      const res = await request(app).post(apiUrl).send(validBody);

      const expectedProps = ['color', 'maxDuties'].sort();
      const allHaveExpectedProps = Object.values(res.body.branches).every(item => {
        const actualProps = Object.keys(item).sort();
        return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
      });

      expect(allHaveExpectedProps).toBe(true);
    });

    it('property "color" of subobject "branches" should be an integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        Object.values(res.body.branches).every(item => Number.isInteger(item.color))
      ).toBe(true);
    });

    it('property "maxDuties" of subobject "branches" should be an integer', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(
        Object.values(res.body.branches).every(item => Number.isInteger(item.maxDuties))
      ).toBe(true);
    });

    it.each([
      {
        telegram: '@username',
        roles: { rota_lns: userData, admin_rota_lns: null }
      },
      {
        telegram: '@username',
        roles: {
          rota_lns: userData,
          rota_di: userData,
          admin_rota_lns: null,
          admin_rota_di: null
        }
      },
      {
        telegram: '@username',
        roles: {
          rota_lns: userData,
          rota_di: userData,
          rota_gp: userData,
          admin_rota_lns: null,
          admin_rota_di: null,
          admin_rota_gp: null
        }
      }
    ])('property "rotaAdmin" should be an array of length equal to number of branches with admin access', async permission => {
      getUser.mockClear();
      getUser.mockResolvedValueOnce(permission);

      const res = await request(app).post(apiUrl).send(validBody);
      expect(Array.isArray(res.body.rotaAdmin)).toBe(true);
      expect(res.body.rotaAdmin.length === permission.roles.length);
    });
  });
});
