import request from 'supertest';
import makeApp from '../../src/app.js';
const app = makeApp();

describe('GET /api/ping', () => {
  it('should return pong', async () => {
    const res = await request(app)
      .get('/api/ping');

    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});