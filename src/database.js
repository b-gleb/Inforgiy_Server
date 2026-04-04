import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();

let mongo_client;
let mongo_db;

export const initializeMongoDB = async () => {
  mongo_client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true
    }
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
  const entry = await mongo_db
    .collection(`rota_${branch}`)
    .findOne({ date: date });

  return entry;
}

export async function getUserDuties(branch, userId, startDate, endDate) {
  const cursor = mongo_db.collection(`rota_${branch}`).find(
    {
      $and: [{ date: { $gte: startDate } }, { date: { $lte: endDate } }],
      rota: { $elemMatch: { $elemMatch: { $eq: userId } } }
    },
    { sort: { date: 1 } }
  );
  const entriesArray = await cursor.toArray();
  return entriesArray;
}

export async function addUserToRota(branch, _id, timeIndex, timeSlot) {
  const entry = await mongo_db.collection(`rota_${branch}`).findOneAndUpdate(
    { _id: _id },
    { $set: { [`rota.${timeIndex}`]: timeSlot } },
    {
      returnDocument: 'after'
    }
  );
  return entry;
}

export async function addUserToRotaMulti({
  branch,
  userId,
  startDate,
  endDate,
  daysOfWeek,
  hours,
  allowOccupiedSlots
}) {
  const baseQuery = {
    $expr: {
      $and: [
        { $gte: ['$date', startDate] },
        { $lte: ['$date', endDate] },
        {
          $in: [
            { $mod: [{ $add: [{ $dayOfWeek: '$date' }, 5] }, 7] },
            daysOfWeek
          ]
        }
      ]
    }
  };

  if (allowOccupiedSlots === true) {
    const updateObj = await mongo_db
      .collection(`rota_${branch}`)
      .updateMany(baseQuery, {
        $addToSet: Object.fromEntries(
          hours.map(hour => [`rota.${hour}`, userId])
        )
      });

    return { modifiedCount: updateObj.modifiedCount * hours.length };
  } else {
    let modifiedCount = 0;

    for (const hour of hours) {
      const updateObj = await mongo_db
        .collection(`rota_${branch}`)
        .updateMany(
          { ...baseQuery, [`rota.${hour}`]: [] },
          { $addToSet: { [`rota.${hour}`]: userId } }
        );

      modifiedCount += updateObj.modifiedCount;
    }

    return { modifiedCount };
  }
}

export async function removeUserFromRota(branch, _id, timeIndex, userId) {
  const entry = await mongo_db.collection(`rota_${branch}`).findOneAndUpdate(
    { _id: _id },
    { $pull: { [`rota.${timeIndex}`]: userId } },
    {
      returnDocument: 'after'
    }
  );
  return entry;
}

export async function removeUserFromRotaMulti({
  branch,
  userId,
  startDate,
  endDate,
  daysOfWeek,
  hours
}) {
  const updateObj = await mongo_db.collection(`rota_${branch}`).updateMany(
    {
      $expr: {
        $and: [
          { $gte: ['$date', startDate] },
          { $lte: ['$date', endDate] },
          {
            $in: [
              { $mod: [{ $add: [{ $dayOfWeek: '$date' }, 5] }, 7] },
              daysOfWeek
            ]
          }
        ]
      }
    },
    {
      $pull: Object.fromEntries(hours.map(hour => [`rota.${hour}`, userId]))
    }
  );

  return { modifiedCount: updateObj.modifiedCount * hours.length };
}

///////////
// USERS //
///////////

// GENERATORS //
function branchUsersSearchQuery(branch) {
  return {
    [`roles.rota_${branch}`]: { $exists: true },
    telegram_id: { $ne: null }
  };
}

function userProjection(branch) {
  return {
    telegram_id: 1,
    telegram: 1,
    [`roles.rota_${branch}`]: 1,
    _id: 0
  };
}

// DATABASE FUNCITONS //
export async function getUser(userId) {
  const entry = await mongo_db.collection('users').findOne(
    { telegram_id: userId },
    {
      projection: {
        telegram: 1,
        roles: 1,
        _id: 0
      }
    }
  );
  return entry;
}

export async function getUserRegion(userId) {
  const entry = await mongo_db
    .collection('users')
    .findOne({ telegram_id: userId }, { projection: { region: 1, _id: 0 } });

  return entry?.region ?? null;
}

export async function getUserCount(branch) {
  const query = branchUsersSearchQuery(branch);
  const count = await mongo_db.collection('users').countDocuments(query);
  return count;
}

export async function getBranchUsers(branch) {
  const query = branchUsersSearchQuery(branch);
  const projection = userProjection(branch);
  const cursor = mongo_db.collection('users').find(query, { projection });
  const entriesArray = await cursor.toArray();
  return entriesArray;
}

export async function addUserPermission(branch, username, nick, color) {
  const projection = userProjection(branch);
  const entry = await mongo_db.collection('users').findOneAndUpdate(
    { telegram: username },
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
}

export async function removeUserPermission(branch, userId) {
  const updateObj = await mongo_db
    .collection('users')
    .updateOne(
      { telegram_id: userId },
      { $unset: { [`roles.rota_${branch}`]: null } }
    );
  return updateObj;
}

export async function updateUser(branch, userId, nick, color) {
  const projection = userProjection(branch);
  const entry = await mongo_db.collection('users').findOneAndUpdate(
    { telegram_id: userId },
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
}

///////////
// STATS //
///////////
export async function getDateRangeStats(branch, userIds, dateRange) {
  const pipeline = [
    {
      $match: {
        $and: [
          { date: { $gte: dateRange[0] } },
          { date: { $lte: dateRange[1] } }
        ]
      }
    },
    { $unwind: { path: '$rota' } },
    { $unwind: { path: '$rota' } },
    { $match: { rota: { $in: userIds } } },
    { $group: { _id: '$rota', count: { $sum: 1 } } }
  ];

  const pipelineOutput = await mongo_db
    .collection(`rota_${branch}`)
    .aggregate(pipeline)
    .toArray();
  return pipelineOutput;
}

export async function getCumulativeStats(branch, userId, dateRanges) {
  const facets = {};

  dateRanges.forEach((dateRange, idx) => {
    facets[`range_${idx}`] = [
      {
        $match: {
          $and: [
            { date: { $gte: dateRange[0] } },
            { date: { $lte: dateRange[1] } }
          ]
        }
      },
      { $unwind: { path: '$rota' } },
      { $unwind: { path: '$rota' } },
      { $match: { rota: userId } },
      { $group: { _id: '$date', dailyCount: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      {
        $setWindowFields: {
          sortBy: { _id: 1 },
          output: {
            count: {
              $sum: '$dailyCount',
              window: { documents: ['unbounded', 'current'] }
            }
          }
        }
      },
      { $project: { date: '$_id', count: 1, _id: 0 } }
    ];
  });

  const pipeline = [{ $facet: facets }];
  const pipelineOutput = await mongo_db
    .collection(`rota_${branch}`)
    .aggregate(pipeline)
    .toArray();
  return pipelineOutput[0];
}

export async function getEmptyDuties(branch, dateRanges) {
  const facets = {};

  dateRanges.forEach((dateRange, idx) => {
    facets[`range_${idx}`] = [
      {
        $match: {
          $and: [
            { date: { $gte: dateRange[0] } },
            { date: { $lte: dateRange[1] } }
          ]
        }
      },
      { $unwind: { path: '$rota' } },
      { $match: { rota: [] } },
      { $group: { _id: '$rota', count: { $sum: 1 } } },
      { $project: { _id: 0 } }
    ];
  });

  const pipeline = [{ $facet: facets }];
  const pipelineOutput = await mongo_db
    .collection(`rota_${branch}`)
    .aggregate(pipeline)
    .toArray();
  return pipelineOutput[0];
}

export async function getTakenDuties(branch, dateRanges) {
  const facets = {};

  dateRanges.forEach((dateRange, idx) => {
    facets[`range_${idx}`] = [
      {
        $match: {
          $and: [
            { date: { $gte: dateRange[0] } },
            { date: { $lte: dateRange[1] } }
          ]
        }
      },
      { $unwind: { path: '$rota', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$rota', preserveNullAndEmptyArrays: false } },
      { $count: 'count' }
    ];
  });

  const pipeline = [{ $facet: facets }];
  const pipelineOutput = await mongo_db
    .collection(`rota_${branch}`)
    .aggregate(pipeline)
    .toArray();
  return pipelineOutput[0];
}

export async function getUniqueUsers(branch, dateRanges) {
  const facets = {};

  dateRanges.forEach((dateRange, idx) => {
    facets[`range_${idx}`] = [
      {
        $match: {
          $and: [
            { date: { $gte: dateRange[0] } },
            { date: { $lte: dateRange[1] } }
          ]
        }
      },
      { $unwind: { path: '$rota', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$rota', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$rota' } },
      { $count: 'count' }
    ];
  });

  const pipeline = [{ $facet: facets }];
  const pipelineOutput = await mongo_db
    .collection(`rota_${branch}`)
    .aggregate(pipeline)
    .toArray();
  return pipelineOutput[0];
}

export async function logUsageStatistics(entry) {
  const insertedEntry = await mongo_db
    .collection('usageStatistics')
    .insertOne(entry);
  return insertedEntry;
}

export default {
  initializeMongoDB,
  // ROTA
  getRota,
  getUserDuties,
  addUserToRota,
  addUserToRotaMulti,
  removeUserFromRota,
  removeUserFromRotaMulti,
  // USERS
  getUser,
  getUserRegion,
  getUserCount,
  getBranchUsers,
  addUserPermission,
  removeUserPermission,
  updateUser,
  // STATS
  getDateRangeStats,
  getCumulativeStats,
  getEmptyDuties,
  getTakenDuties,
  getUniqueUsers,
  logUsageStatistics
};
