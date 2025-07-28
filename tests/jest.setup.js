import { jest } from '@jest/globals';
import { initializeMongoDB } from '../src/config/db.js';
let mongo_client;

beforeAll(async () => {
  console.log = jest.fn();
  mongo_client = await initializeMongoDB();
});
  
afterAll(async () => {
  if (mongo_client) {
    await mongo_client.close();
  }
});