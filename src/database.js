import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

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


export async function getRota(branch, date) {
  const entry = await mongo_db.collection(`rota_${branch}`).findOne({date: date});
  return entry;
};


export async function getUserDuties(branch, userId, startDate, endDate) {
  const cursor = mongo_db.collection(`rota_${branch}`).find(
    {
      '$and': [
        {'date': {'$gte': startDate}},
        {'date': {'$lte': endDate}}
      ],
      'rota': {'$elemMatch': {'$elemMatch': {'$eq': userId}}}
    },
    {sort: {date: 1}}
  );
  const entriesArray = await cursor.toArray();
  return entriesArray;
};


export async function addUserToRota(branch, _id, timeIndex, timeSlot) {
  const entry = await mongo_db.collection(`rota_${branch}`).findOneAndUpdate(
    {_id: _id},
    {"$set": {[`rota.${timeIndex}`]: timeSlot}},
    {
      returnDocument: 'after'
    }
  );
  return entry;
};


export async function removeUserFromRota(branch, date, timeIndex, modifyUserId) {
  const entry = await mongo_db.collection(`rota_${branch}`).findOneAndUpdate(
    {date: date},
    {"$pull": {[`rota.${timeIndex}`]: modifyUserId}},
    {
      returnDocument: 'after'
    }
  );
  return entry;
};


// TODO: getDB to be removed after 
export const getDB = () => {
  if (!mongo_db) {
    throw new Error('MongoDB not initialized. Call initializeMongoDB() first.');
  }
  return mongo_db;
};


export default {
  initializeMongoDB,
  getRota,
  getUserDuties,
  addUserToRota,
  removeUserFromRota
};