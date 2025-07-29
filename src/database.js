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

//////////
// ROTA //
//////////
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

///////////
// USERS //
///////////

// GENERATORS //
function branchUsersSearchQuery(branch) {
  return {
    [`roles.rota_${branch}`]: {$exists: true},
    'telegram_id': {'$ne': null}
  };
};


function userProjection(branch) {
  return {
    'telegram_id': 1,
    'telegram': 1,
    [`roles.rota_${branch}`]: 1,
    '_id': 0
  };
};

// DATABASE FUNCITONS //
export async function getUserCount(branch) {
  const query = branchUsersSearchQuery(branch);
  const count = await mongo_db.collection('users').countDocuments(query);
  return count;
};


export async function getBranchUsers(branch) {
  const query = branchUsersSearchQuery(branch);
  const projection = userProjection(branch);
  const cursor = mongo_db.collection('users').find(
    query,
    {
      projection: projection
    }
  );
  const entriesArray = await cursor.toArray();
  return entriesArray;
};


export async function addUserPermission(branch, username, nick, color) {
  const projection = userProjection(branch);
  const entry = await mongo_db.collection('users').findOneAndUpdate(
    {telegram: username},
    {
      $set: {
        [`roles.rota_${branch}`]: {
          nick: nick,
          c: color
        }
      }
    },
    {
      projection: projection,
      returnDocument: 'after'
    }
  );

  return entry;
};


export async function removeUserPermission(branch, userId) {
  const entry = await mongo_db.collection('users').updateOne(
    {telegram_id: userId},
    {$unset: {[`roles.rota_${branch}`]: null}}
  );
  return entry;
};


export async function updateUser(branch, userId, nick, color) {
  const projection = userProjection(branch);
  const entry = await mongo_db.collection('users').findOneAndUpdate(
    {telegram_id: userId},
    {
      $set: {
        [`roles.rota_${branch}`]: {
          nick: nick,
          c: color
        }
      }
    },
    {
      projection: projection,
      returnDocument: 'after'
    }
  );
  return entry;
};

///////////
// STATS //
///////////
export async function getDateRangeStats(branch, userIds, dateRange) {
  const pipeline = [
    {
      '$match': {
        '$and': [
          {
            'date': {
              '$gte': dateRange[0]
            }
          }, {
            'date': {
              '$lte': dateRange[1]
            }
          }
        ]
      }
    }, {
      '$unwind': {
        'path': '$rota'
      }
    }, {
      '$unwind': {
        'path': '$rota'
      }
    }, {
      '$match': {
        'rota': {
          '$in': userIds
        }
      }
    }, {
      '$group': {
        '_id': '$rota', 
        'count': {
          '$sum': 1
        }
      }
    }
  ];

  const pipelineOutput = await mongo_db.collection(`rota_${branch}`).aggregate(pipeline).toArray();
  return pipelineOutput;
};


export async function getCummulativeStats(branch, userId, dateRange) {
  const pipeline = [
    {
      $match:
        {
          $and: [
            {
              date: {
                $gte: dateRange[0]
              }
            },
            {
              date: {
                $lte: dateRange[1]
              }
            }
          ]
        }
    },
    {
      $unwind: {
        path: "$rota"
      }
    },
    {
      $unwind: {
        path: "$rota"
      }
    },
    {
      $match:
        {
          rota: userId
        }
    },
    {
      $group: {
        _id: "$date",
        dailyCount: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        _id: 1
      }
    },
    {
      $setWindowFields: {
        sortBy: {
          _id: 1
        },
        output: {
          cumulativeCount: {
            $sum: "$dailyCount",
            window: {
              documents: ["unbounded", "current"]
            }
          }
        }
      }
    },
    {
      $project: {
        date: "$_id",
        cumulativeCount: 1,
        _id: 0
      }
    }
  ];

  const pipelineOutput = await mongo_db.collection(`rota_${branch}`).aggregate(pipeline).toArray();
  return pipelineOutput;
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
  // ROTA
  getRota,
  getUserDuties,
  addUserToRota,
  removeUserFromRota,
  // USERS
  getUserCount,
  getBranchUsers,
  addUserPermission,
  removeUserPermission,
  updateUser,
  // STATS
  getDateRangeStats,
  getCummulativeStats
};