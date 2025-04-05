const request = require('supertest');
const app = require('../server');
const {MongoClient} = require('mongodb');

let mongo_client, mongo_db;

beforeAll(async () => {
    mongo_client = await MongoClient.connect(process.env.MONGO_URI, {
    });
    mongo_db = mongo_client.db(process.env.DB_NAME)
  });
  
afterAll(async () => {
await mongo_client.close();
});


describe('GET /api/ping', () => {
    it('should return pong', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.status).toBe(200);
    });
  });

describe('GET /api/rota', () => {
  it('should return rota for a day', async () => {
    const res = await request(app).get('/api/rota').query({branch: 'lns', date: '2025-01-01'});
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});
