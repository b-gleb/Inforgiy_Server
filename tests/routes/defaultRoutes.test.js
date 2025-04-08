const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/ping', () => {
  it('should return pong', async () => {
    const res = await request(app)
      .get('/api/ping');

    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});