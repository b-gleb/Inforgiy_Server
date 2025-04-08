require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

let mongo_client, mongo_db;

const initializeMongoDB = async () => {
  mongo_client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
  });

  try {
    await mongo_client.connect();
    mongo_db = mongo_client.db(process.env.DB_NAME)
    console.log("Connected to MongoDB");
    return mongo_client, mongo_db
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  };
};

const getDB = () => {
  if (!mongo_db) {
    throw new Error('MongoDB not initialized. Call initializeMongoDB() first.');
  }
  return mongo_db;
};

module.exports = {
  initializeMongoDB,
  getDB
}
