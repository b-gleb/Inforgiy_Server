import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
const makeApp = (await import('../../src/app.js')).default;

const app = makeApp({

});

describe('GET /api/ping', () => {
  it('should return pong', async () => {
    const res = await request(app)
      .get('/api/ping');

    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});


describe('POST /api/auth', () => {
  let initDataUnsafe;

  beforeAll(() => {});
  beforeEach(() => {});

  describe('INVALID PARAMETERS POST /api/auth', () => {
    it('should respond with status code 400 if any of the parameters are missing', async () => {
      const res = await request(app).post('/api/auth').send({});
      expect(res.statusCode).toBe(400);
    });
  });



  describe('VALID PARAMETERS POST /api/auth', () => {
    // should respond with status code 200


    // should respond with status code 401 if unable to verify hash


    // should respond with status code 403 if user has no roles


    // should respond with status code 404 if user is not found


    // should specify json in the content type header


    // should call `validateInitData` once


    // should call `getUser` once


    // should not call `getUser` if `validateInitData` failed
  });



  describe('RESPONSE VALIDATION POST /api/auth', () => {
    // should return an object


    // response object should have properties "branches", "rotaAdmin"


    // property "branches" should be an object of length equal to number of branches with access


    // subobject of "branches" should have properties "color" and "maxDuties"


    // property "color" of subobject "branches" should be an integer


    // property "maxDuties" of subobject "branches" should be an integer


    // property "rotaAdmin" should be an array of length equal to number of branches with admin access
  });
});