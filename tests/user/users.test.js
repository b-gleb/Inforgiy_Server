// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { departmentMember } from '../../schemas/departmentMember.schema.js';
import cache from '../../src/utils/cache.js';
import { generateAdmin, generateUser } from '../generators.js';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn()
}));
const { verifyToken } = await import('../../src/utils/jwt.js');

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const getBranchUsers = jest.fn();

const app = makeApp({
  getUser,
  getBranchUsers
});

const apiUrl = '/api/users';
const callerId = 1230;
const mockUser = { id: callerId, username: 'test_user' };
const authToken = 'Bearer valid-token';
const branch = 'lns';
const validBody = { branch };

describe(`POST ${apiUrl}`, () => {
  beforeAll(() => {
    verifyToken.mockReturnValue(mockUser);
    getUser.mockResolvedValue(generateAdmin(branch, callerId));
    getBranchUsers.mockResolvedValue([
      generateUser(branch, 4567),
      generateAdmin(branch, callerId)
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cache.flushAll();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each([{}, undefined, null])(
      'should respond with status code 400 for invalid body: %j',
      async body => {
        const res = await request(app)
          .post(apiUrl)
          .set('Authorization', authToken)
          .send(body);
        expect(res.statusCode).toBe(400);
      }
    );

    it('should respond with status code 401 if no Authorization header is provided', async () => {
      const res = await request(app).post(apiUrl).send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 401 if token is invalid or expired', async () => {
      verifyToken.mockReturnValueOnce(null);
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if non admin user requests operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, callerId));
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with a status code of 500 if DB call fails', async () => {
      // suppress console.error output
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      getUser.mockRejectedValueOnce(new Error('DB exception occured'));
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: 'Internal server error'
      });

      errorSpy.mockRestore();
    });
  });

  describe('Response Validation', () => {
    it('should respond with status code 200', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching an array of departmentMember', async () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validSchema = ajv.compile({
        type: 'array',
        items: departmentMember
      });

      const res = await request(app)
        .post(apiUrl)
        .set('Authorization', authToken)
        .send(validBody);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }

      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should call isRotaAdmin() once', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(callerId);
    });

    it('should call getBranchUsers() once', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);
      expect(getBranchUsers).toHaveBeenCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch);
    });

    it('should not call getBranchUsers() twice and pull from cache', async () => {
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);
      await request(app).post(apiUrl).set('Authorization', authToken).send(validBody);

      expect(getBranchUsers).toHaveBeenCalledTimes(1);
      expect(getBranchUsers).toHaveBeenCalledWith(branch);
    });
  });
});
