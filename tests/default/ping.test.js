import { describe, expect } from '@jest/globals';
import request from 'supertest';

const makeApp = (await import('../../src/app.js')).default;
const app = makeApp({});

describe('GET /api/ping', () => {
  it('should return pong', async () => {
    const res = await request(app).get('/api/ping');

    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});
