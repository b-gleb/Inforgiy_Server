import { describe, expect } from '@jest/globals';
import request from 'supertest';

const makeApp = (await import('../src/app.js')).default;
const app = makeApp({});

describe('UNKNOWN ENDPOINT', () => {
  it('should return status code 404 when calling an unknown endpoint', async () => {
    const res = await request(app).get('/api/endpoint-not-found');
    expect(res.statusCode).toBe(404);
  });
});