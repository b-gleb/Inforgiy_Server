import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import settup from '../../src/config/settup.json' with { type: 'json' };
import { generateUser, generateAdmin } from './generators.js';

jest.unstable_mockModule('../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}));
const { validateInitData } = await import(
  '../../src/utils/initDataValidation.js'
);

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();
const removeUserPermission = jest.fn();

const app = makeApp({
  getUser,
  removeUserPermission
});

describe('POST /api/removeUser', () => {
  let branch;
  let validBody;

  beforeAll(() => {
    branch = Object.keys(settup)[0];
    validBody = {
      branch,
      modifyUserId: 4560,
      initDataUnsafe: { user: { id: 1230 } }
    };

    validateInitData.mockReturnValue(true);
    getUser.mockResolvedValue(generateAdmin(branch, 1230));
    removeUserPermission.mockResolvedValue({ matchedCount: 1 });
  });

  beforeEach(() => {
    validateInitData.mockClear();
    getUser.mockClear();
    removeUserPermission.mockClear();
  });

  describe('INVALID PARAMETERS POST /api/removeUser', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const bodyData = [
        { modifyUserId: 4560, initDataUnsafe: { user: { id: 1230 } } },
        { branch, initDataUnsafe: { user: { id: 1230 } } },
        { branch, modifyUserId: 4560 },
        {}
      ];

      for (const body of bodyData) {
        const res = await request(app).post('/api/removeUser').send(body);
        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe('VALID PARAMETERS POST /api/removeUser', () => {
    it('should respond with status code 204', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(204);
    });

    it('should respond with no content', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.body).toEqual({});
      expect(res.text).toBe('');
    });

    it('should respond with status code 401 if unable to verify hash', async () => {
      validateInitData.mockReturnValueOnce(false);
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(401);
    });

    it('should respond with status code 403 if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(403);
    });

    it('should respond with status code 404 if user to modify is not found', async () => {
      removeUserPermission.mockResolvedValueOnce({ matchedCount: 0 });
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(res.statusCode).toBe(404);
    });

    it('should call isRotaAdmin() once', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(1230);
    });

    it('should call removeUserPermission() once', async () => {
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(removeUserPermission).toHaveBeenCalledTimes(1);
      expect(removeUserPermission).toHaveBeenCalledWith(branch, 4560);
    });

    it('should not call removeUserPermission() if non admin performs the operation', async () => {
      getUser.mockResolvedValueOnce(generateUser(branch, 1230));
      const res = await request(app).post('/api/removeUser').send(validBody);
      expect(removeUserPermission).toHaveBeenCalledTimes(0);
    });
  });
});
