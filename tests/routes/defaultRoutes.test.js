import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/ping', () => {
  it('should return pong', async () => {
    const res = await request(app)
      .get('/api/ping');

    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});