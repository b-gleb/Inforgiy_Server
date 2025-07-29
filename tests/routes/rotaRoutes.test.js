import { beforeEach, describe, expect, jest } from '@jest/globals'
import request from 'supertest';
import makeApp from '../../src/app.js';
import { lastDayOfYear, format } from "date-fns";
import settup from '../../src/config/settup.json' with { type: 'json' };

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
      ]

      for (const body of bodyData){
        const res = await request(app).get('/api/rota').query(body);
        expect(res.statusCode).toBe(400);
      }
      
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


    it('array element "users" should be an object', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(res.body[0]['users']).toBeInstanceOf(Object);
    });


    it('array element "label" should be a string', async () => {
      getRota.mockResolvedValue({});

      const res = await request(app).get('/api/rota').query({
        branch: branch,
        date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
      });

      expect(typeof res.body[0]['label']).toBe('string');
    });
  });
});
