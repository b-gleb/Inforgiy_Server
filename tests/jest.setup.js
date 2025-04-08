// const {MongoClient} = require('mongodb');
const { initializeMongoDB } = require('../src/config/db');

let mongo_client;

beforeAll(async () => {
    console.log = jest.fn();
    mongo_client = await initializeMongoDB();
  });
  
// afterAll(async () => {
//   console.log(mongo_client)
//   await mongo_client.close();
// });