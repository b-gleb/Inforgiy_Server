// biome-ignore lint/correctness/noUndeclaredDependencies: @jest/globals is exported by the jest package.
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import Ajv from 'ajv';
import request from 'supertest';
import { userDetail } from '../../schemas/userDetail.schema.js';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn()
}));
const { verifyToken } = await import('../../src/utils/jwt.js');

const makeApp = (await import('../../src/app.js')).default;

const getUser = jest.fn();

const app = makeApp({
  getUser
});

const ajv = new Ajv({ allErrors: true, strict: true });

const userId = 431489551;
const otherUserId = 123456789;
const apiUrl = (id = userId) => `/api/users/${id}`;
const authToken = 'Bearer valid-token';
const userEntry = {
  telegram: '@username',
  telegram_id: userId,
  roles: {
    inforg: null,
    rota_gp: { c: 3, nick: '@nickname' },
    rota_di: { c: 0, nick: 'nickname' },
    admin_rota_di: null
  }
};

describe(`GET ${apiUrl()}`, () => {
  beforeAll(() => {
    verifyToken.mockReturnValue({ id: userId, username: '@test_user' });
    getUser.mockResolvedValue(userEntry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation, Authentication, Authorization', () => {
    it.each(['abc', 'null', '1.5', '-', null])(
      'should respond with status code 400 if invalid userId is provided in params: %s',
      async invalidId => {
        const res = await request(app)
          .get(apiUrl(invalidId))
          .set('Authorization', authToken);
        expect(res.statusCode).toBe(400);
        expect(getUser).not.toHaveBeenCalled();
      }
    );

    it('should respond with status code 403 if requesting another users entry', async () => {
      const res = await request(app)
        .get(apiUrl(otherUserId))
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(403);
      expect(getUser).not.toHaveBeenCalled();
    });

    it('should respond with status code 404 if user does not exist', async () => {
      getUser.mockResolvedValueOnce(null);
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Response Validation', () => {
    it('should return status code 200', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
    });

    it('should specify json in the content type header', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);
      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return payload matching the user detail schema', async () => {
      const validSchema = ajv.compile(userDetail);
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);

      const valid = validSchema(res.body);
      if (!valid) {
        console.error(validSchema.errors);
      }
      expect(valid).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should call `getUser` once with the userId from params', async () => {
      await request(app).get(apiUrl()).set('Authorization', authToken);

      expect(getUser).toHaveBeenCalledTimes(1);
      expect(getUser).toHaveBeenCalledWith(userId);
    });

    it('should map telegram_id and telegram to id and username', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);

      expect(res.body.id).toBe(userEntry.telegram_id);
      expect(res.body.username).toBe(userEntry.telegram);
    });

    it('should return only departments from non-null `rota_` roles', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);

      const departments = res.body.departments.map(d => d.department);
      expect(departments).toHaveLength(2);
      expect(departments).toEqual(expect.arrayContaining(['gp', 'di']));
    });

    it('should not include non-rota roles or `admin_rota_` roles as departments', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);

      const departments = res.body.departments.map(d => d.department);
      expect(departments).not.toContain('inforg');
      expect(departments).not.toContain('rescue_agency');
      expect(departments.some(d => d.startsWith('admin_'))).toBe(false);
    });

    it('should map nick and c to nick and color', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);

      expect(res.body.departments).toContainEqual(
        expect.objectContaining({ department: 'gp', nick: '@nickname', color: 3 })
      );
      expect(res.body.departments).toContainEqual(
        expect.objectContaining({ department: 'di', nick: 'nickname', color: 0 })
      );
    });

    it('should return an empty departments array if user has no rota roles', async () => {
      getUser.mockResolvedValueOnce({
        ...userEntry,
        roles: { inforg: null, rescue_agency: null }
      });

      const res = await request(app).get(apiUrl()).set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.departments).toEqual([]);
    });

    it('should set isAdmin to true only for departments with a matching `admin_rota_` role', async () => {
      const res = await request(app).get(apiUrl()).set('Authorization', authToken);

      expect(res.body.departments).toContainEqual(
        expect.objectContaining({ department: 'di', isAdmin: true })
      );
      expect(res.body.departments).toContainEqual(
        expect.objectContaining({ department: 'gp', isAdmin: false })
      );
    });
  });
});
