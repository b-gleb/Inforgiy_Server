import { beforeEach, describe, expect, jest } from '@jest/globals';
import request from 'supertest';
import { lastDayOfYear, format } from "date-fns";
import settup from '../../src/config/settup.json' with { type: 'json' };

jest.unstable_mockModule('../src/utils/initDataValidation.js', () => ({
  validateInitData: jest.fn()
}))
const {validateInitData} = await import('../../src/utils/initDataValidation.js');
const makeApp = (await import('../../src/app.js')).default;


const getRota = jest.fn();
const getUserDuties = jest.fn();
const removeUserFromRota = jest.fn();
const addUserToRota = jest.fn();

const app = makeApp({
  getRota,
  getUserDuties,
  removeUserFromRota,
  addUserToRota
});

const rotaDBEntry = {
  "_id": "676d7f9f8300f637d426cee9",
  "date": new Date(2025, 2, 9),
  "rota": [
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [1813610409],
    [1171875915, 1813610409],
    [1171875915, 1813610409],
    [1171875915],
    [1171875915],
    [1171875915],
    [1171875915],
    [573769247],
    [573769247],
    [573769247],
    [573769247],
    [573769247],
    [573769247]
  ]
}


describe('GET /api/rota', () => {
  beforeEach(() => {
    getRota.mockReset();
  });

  describe('INVALID PARAMETERS GET /api/rota', () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {branch: Object.keys(settup)[0]},
        {date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')},
        {}
      ];

      for (const body of bodyData){
        const res = await request(app).get('/api/rota').query(body);
        expect(res.statusCode).toBe(400);
      };
      
    });
  });


  describe('VALID PARAMETERS GET /api/rota', () => {
    it('should respond with a status code of 200', async () => {
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.statusCode).toBe(200);
    });


    it('should respond with a status code of 404 if date is not found', async () => {
      getRota.mockResolvedValue(null);
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: '1990-01-01'
      });

      expect(res.statusCode).toBe(404);
    });


    it('should specify json in the content type header', async () => {
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

  
    it('should query the database for day rota', async () => {
      const res = await request(app).get('/api/rota').query({
        branch: 'lns',
        date: '2025-01-01'
      });

      expect(getRota.mock.calls.length).toBe(1);
      expect(getRota.mock.calls[0][0]).toBe('lns');
      expect(getRota.mock.calls[0][1].toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });


  describe.each(Object.keys(settup))('RESPONSE VALIDATION GET /api/rota for branch %s', (branch) => {
    it('response should be an array of length 24', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(24);
    });


    it('array element should have properties "users" and "label"', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body[0]).toHaveProperty('users');
      expect(res.body[0]).toHaveProperty('label');
    });


    it('array element property "users" should be of type object', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body[0]['users']).toBeInstanceOf(Object);
    });


    it('array element property "label" should be of type string', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(typeof res.body[0]['label']).toBe('string');
    });
  });
});





describe('GET /api/userDuties', () => {
  beforeEach(() => {
    getUserDuties.mockReset();
  });

  describe('INVALID PARAMETRS GET /api/userDuties', () => {
    it('should respond with a status code 400 when any parameter is missing', async () => {
      const bodyData = [
        {userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'},
        {branch: Object.keys(settup)[0], startDate: '2025-01-01', endDate: '2025-01-08'},
        {branch: Object.keys(settup)[0], userId: 1230, endDate: '2025-01-08'},
        {branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01'},
        {}
      ];

      for (const body of bodyData){
        const res = await request(app).get('/api/userDuties').query(body);
        expect(res.statusCode).toBe(400);
      };
      
    });


    it('should respond with a status code 400 when startDate is larger than endDate', async () => {
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-08', endDate: '2025-01-01'});

      expect(res.statusCode).toBe(400);
    });
  });


  describe('VALID PARAMETERS GET /api/userDuties', () => {
    it('should respond with status code 200', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.statusCode).toBe(200);
    });


    it('should specify json in the content type header', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

  
    it('should query the database for user duties', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: 'di', userId: 12345, startDate: '2026-01-01', endDate: '2026-01-08'});

      expect(getUserDuties.mock.calls.length).toBe(1);
      expect(getUserDuties.mock.calls[0][0]).toBe('di');
      expect(getUserDuties.mock.calls[0][1]).toBe(12345);
      expect(getUserDuties.mock.calls[0][2].toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(getUserDuties.mock.calls[0][3].toISOString()).toBe('2026-01-08T00:00:00.000Z');
    });
  });


  describe('RESPONSE VALIDATION GET /api/userDuties', () => {
    it('should return an empty array if no duties are found', async () => {
      getUserDuties.mockResolvedValue([]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1230, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });


    it('should return an array of objects if any duties are found', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body[0]).toBeInstanceOf(Object);
    });


    it('array element should have properties "date" and "hours"', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body[0]).toHaveProperty('date');
      expect(res.body[0]).toHaveProperty('hours');
    });


    it('array element property "date" should be of type date', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(typeof res.body[0]['date']).toBe('string');
      expect(res.body[0]['date']).toMatch(/^\d{4}-\d{2}-\d{2}(T.*)?$/);
    });


    it('array element property "hours" should be of type array', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body[0]['hours']).toBeInstanceOf(Array);
    });


    it('array element property "hours" should not be empty', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(res.body[0]['hours']).not.toHaveLength(0);
    });


    it('array element property "hours" should contain numbers', async () => {
      getUserDuties.mockResolvedValue([rotaDBEntry]);
      const res = await request(app).get('/api/userDuties').query({branch: Object.keys(settup)[0], userId: 1813610409, startDate: '2025-01-01', endDate: '2025-01-08'});

      expect(Number.isInteger(res.body[0]['hours'][0])).toBe(true);
    });
  });
});
