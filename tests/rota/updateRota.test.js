// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import { format } from 'date-fns';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateAdmin, generateUser } from '../generators.js';
import { rotaDBEntry } from './mocks.js';

jest.unstable_mockModule('../../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import('../../src/utils/initDataValidation.js');

const makeApp = (await import('../../src/app.js')).default;

const getRota = jest.fn();
const removeUserFromRota = jest.fn();
const addUserToRota = jest.fn();
const getUser = jest.fn();

const app = makeApp({
  getRota,
  removeUserFromRota,
  addUserToRota,
  getUser
});

const apiUrl = '/api/updateRota';

describe(`POST ${apiUrl}`, () => {
  let branch;
  let wrongBranch;
  let date;
  let userId;
  let timeRange;
  let initDataUnsafe;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    wrongBranch = Object.keys(settup)[1];
    date = format(new Date(), 'yyyy-MM-dd');
    userId = 1813610409;
    timeRange = '05:00-06:00';
    initDataUnsafe = { user: { id: 1813610409 } };

    validBody = {
      branch,
      date,
      userId,
      timeRange,
      initDataUnsafe
    };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, validBody.initDataUnsafe.user.id));
    getRota.mockResolvedValue(rotaDBEntry);
    removeUserFromRota.mockResolvedValue(rotaDBEntry);
    addUserToRota.mockResolvedValue(rotaDBEntry);
  });

  beforeEach(() => {
    getRota.mockClear();
    removeUserFromRota.mockClear();
    addUserToRota.mockClear();
    validateInitData.mockClear();
    getUser.mockClear();
  });

  describe(`INVALID PARAMETERS POST ${apiUrl}`, () => {
    it.each([
      { branch, date, timeRange, userId, initDataUnsafe },
      { type: 'add', date, timeRange, userId, initDataUnsafe },
      { type: 'add', branch, timeRange, userId, initDataUnsafe },
      { type: 'add', branch, date, userId, initDataUnsafe },
      { type: 'add', branch, date, timeRange, initDataUnsafe },
      { type: 'add', branch, date, timeRange, userId },
      {}
    ])('should respond with status code 400 for incomplete body: %j', async body => {
      const res = await request(app).post(apiUrl).send(body);
      expect(res.statusCode).toBe(400);
    });
  });

  describe(`VALID PARAMETERS POST ${apiUrl}`, () => {
    describe.each(['add', 'remove'])('Using type "%s" to modify rota', type => {
      it('should respond with status code 200', async () => {
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });
        expect(res.statusCode).toBe(200);
      });

      it('should respond with status code 401 if unable to verify hash', async () => {
        validateInitData.mockReturnValueOnce(false);
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });
        expect(res.statusCode).toBe(401);
      });

      it('should respond with status code 404 if trying to modify date which does not exist', async () => {
        getRota.mockResolvedValueOnce(null);
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });
        expect(res.statusCode).toBe(404);
      });

      it('should specify json in the content type header', async () => {
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });

        expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
      });
    });

    describe('Adding a user to rota', () => {
      it('should respond with status code 403 if non admin user tries to add not themselves to rota', async () => {
        getUser.mockResolvedValueOnce(null);
        const res = await request(app)
          .post(apiUrl)
          .send({ ...validBody, type: 'add', userId: 1230 });

        expect(res.statusCode).toBe(403);
        expect(getUser).toHaveBeenCalledTimes(2);
        expect(getUser).toHaveBeenCalledWith(validBody.initDataUnsafe.user.id);
        expect(addUserToRota).toHaveBeenCalledTimes(0);
      });

      it('should respond with status code 404 if adding a user not assigned to current rota', async () => {
        getUser
          .mockResolvedValueOnce(generateAdmin(validBody.branch, initDataUnsafe.user.id))
          .mockResolvedValueOnce(generateUser(wrongBranch, validBody.userId));

        const res = await request(app)
          .post(apiUrl)
          .send({ type: 'add', ...validBody });

        expect(res.statusCode).toBe(404);
        expect(getUser).toHaveBeenCalledTimes(2);
        expect(getUser).toHaveBeenLastCalledWith(validBody.userId);
        expect(addUserToRota).toHaveBeenCalledTimes(0);
      });

      it('should respond with status code 200 if non admin user trues to add themselves to rota', async () => {
        getUser.mockResolvedValueOnce({ telegram: '@username', roles: {} });
        const res = await request(app)
          .post(apiUrl)
          .send({ type: 'add', ...validBody });
        expect(res.statusCode).toBe(200);
      });

      it('should call addUserToRota() when adding a user to rota', async () => {
        const _res = await request(app)
          .post(apiUrl)
          .send({ type: 'add', ...validBody });

        expect(addUserToRota).toHaveBeenCalledTimes(1);
        expect(removeUserFromRota).toHaveBeenCalledTimes(0);
        // biome-ignore format: prevent method split
        expect(addUserToRota).toHaveBeenCalledWith(branch, 'database_id', 5, [1813610409]);
      });
    });

    describe('Removing a user from rota', () => {
      it('should respond with status code 200 if removing a user not assigned to current rota', async () => {
        getUser.mockResolvedValueOnce(
          generateAdmin(branch, validBody.initDataUnsafe.user.id)
        );

        const res = await request(app)
          .post(apiUrl)
          .send({ type: 'remove', ...validBody });

        expect(res.statusCode).toBe(200);
        expect(getUser).toHaveBeenCalledTimes(1);
        expect(getUser).toHaveBeenCalledWith(validBody.initDataUnsafe.user.id);
        expect(removeUserFromRota).toHaveBeenCalledTimes(1);
      });

      it('should respond with status code 403 if non admin user tries to remove any user from rota', async () => {
        getUser.mockResolvedValueOnce({ telegram: '@username', roles: {} });
        const res = await request(app)
          .post(apiUrl)
          .send({ type: 'remove', ...validBody });
        expect(res.statusCode).toBe(403);
      });

      it('should call removeUserFromRota() when removing user from rota', async () => {
        const _res = await request(app)
          .post(apiUrl)
          .send({ type: 'remove', ...validBody });

        expect(removeUserFromRota).toHaveBeenCalledTimes(1);
        expect(addUserToRota).toHaveBeenCalledTimes(0);
        // biome-ignore format: prevent method split
        expect(removeUserFromRota).toHaveBeenCalledWith(branch, 'database_id', 5, 1813610409);
      });
    });
  });

  describe.each(['add', 'remove'])(
    `RESPONSE VALIDATION POST ${apiUrl} for type "%s"`,
    type => {
      it('response should be an array of length 24', async () => {
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });

        expect(res.body).toBeInstanceOf(Array);
        expect(res.body).toHaveLength(24);
      });

      it('array elements should have properties "users" and "label"', async () => {
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });

        const expectedProps = ['users', 'label'].sort();
        const allHaveExpectedProps = res.body.every(item => {
          const actualProps = Object.keys(item).sort();
          return JSON.stringify(actualProps) === JSON.stringify(expectedProps);
        });

        expect(allHaveExpectedProps).toBe(true);
      });

      it('array element "users" should be of type object', async () => {
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });

        expect(
          res.body.every(item => typeof item.users === 'object' && item.users != null)
        ).toBe(true);
      });

      it('array element property "label" should be of type string', async () => {
        const res = await request(app)
          .post(apiUrl)
          .send({ type, ...validBody });

        expect(res.body.every(item => typeof item.label === 'string')).toBe(true);
      });
    }
  );
});
