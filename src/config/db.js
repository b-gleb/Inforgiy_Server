import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ServerApiVersion } from 'mongodb';

let mongo_client;
let mongo_db;

export const initializeMongoDB = async () => {
  mongo_client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
  });

  await mongo_client.connect();
  mongo_db = mongo_client.db(process.env.DB_NAME);
  console.log('Connected to MongoDB');
  return mongo_client;
};

export const getDB = () => {
  if (!mongo_db) {
    throw new Error('MongoDB not initialized. Call initializeMongoDB() first.');
  }
  return mongo_db;
};
