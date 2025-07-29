import { jest } from '@jest/globals';
// TODO: Potentially substitute with a mock database
import database from '../src/database.js';
let mongo_client;

beforeAll(async () => {
  console.log = jest.fn();
  mongo_client = await database.initializeMongoDB();
});
  
afterAll(async () => {
  if (mongo_client) {
    await mongo_client.close();
  }
});