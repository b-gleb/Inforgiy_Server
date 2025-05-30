import request from 'supertest';
import { lastDayOfYear, subDays, format } from "date-fns";
import app from '../../src/app.js';

import settup from '../../src/config/settup.json' with { type: 'json' };


describe.each(Object.keys(settup))('GET /api/rota for branch %s', (branch) => {
  it('should return rota for 24 hour branches', async () => {
    const res = await request(app)
      .get('/api/rota')
      .query({ branch, date: format(lastDayOfYear(new Date()), 'yyyy-MM-dd') });
    
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toHaveLength(24);

    expect(res.body[0]).toHaveProperty('users');
    expect(res.body[0]).toHaveProperty('label');

    expect(res.body[0].users).toBeInstanceOf(Object);
    expect(typeof res.body[0].label).toBe('string');
  })
});
