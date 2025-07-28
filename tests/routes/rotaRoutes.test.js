import request from 'supertest';
import { lastDayOfYear, format } from "date-fns";
import app from '../../src/app.js';
import settup from '../../src/config/settup.json' with { type: 'json' };


describe.each(Object.keys(settup))('VALID GET /api/rota for branch %s', (branch) => {
  it('should respond with a status code of 200', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: branch,
      date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
    });

    expect(res.statusCode).toBe(200);
  });


  it('should specify json in the content type header', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: branch,
      date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
    });

    expect(res.headers['content-type']).toEqual(expect.stringContaining('json'));
  });


  it('response should be an array of length 24', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: branch,
      date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
    });

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toHaveLength(24);
  });


  it('array element should have properties "users" and "label"', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: branch,
      date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
    });

    expect(res.body[0]).toHaveProperty('users');
    expect(res.body[0]).toHaveProperty('label');
  });


  it('array element "users" should be an object', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: branch,
      date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
    });

    expect(res.body[0]['users']).toBeInstanceOf(Object);
  });


  it('array element "label" should be a string', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: branch,
      date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd')
    });

    expect(typeof res.body[0]['label']).toBe('string');
  });
});



describe('INVALID GET /api/rota', () => {
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


  it('should respond with a status code 404 when querying a non-existent date', async () => {
    const res = await request(app).get('/api/rota').query({
      branch: Object.keys(settup)[0],
      date: '1990-01-01'
    });

    expect(res.statusCode).toBe(404);
  });
});
