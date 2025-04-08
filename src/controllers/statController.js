const { getDB } = require('../config/db');
const Joi = require('joi')
const { validateBranch, validateUserId, validateDateRange } = require('../utils/responseValidation');
const { convertUserId } = require('../utils/converters');



const stats = async (req, res) => {
  const mongo_db = getDB();

  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    user_ids: Joi.array().min(1).items(validateUserId).required(),
    dateRanges: Joi.array().min(1).items(validateDateRange).required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // Logic
  const stats = {};

  for (const dateRange of value.dateRanges){
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
            '$in': value.user_ids
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

    const pipeline_output = await mongo_db.collection(`rota_${value.branch}`).aggregate(pipeline).toArray();

    // An array to account for all returned user ids
    const returnedUserIds = [];

    // For returned users push stats values
    for (const document of pipeline_output) {
      (stats[document._id] ??= []).push({
        dateRange: dateRange,
        count: document.count
      });

      returnedUserIds.push(document._id);
    };

    // Identify user_ids not returned and fill them with zero
    const notReturnedUserIds = value.user_ids.filter(user_id => !returnedUserIds.includes(user_id));
    for (const user_id of notReturnedUserIds) {
      (stats[user_id] ??= []).push({
        dateRange: dateRange,
        count: 0
      })
    }
  };

  // Conver user ids to nick names
  const allUserIds = Object.keys(stats);
  const convertedStats = await Promise.all(
    allUserIds.map( async (user_id) => {
      const userObj = await convertUserId(value.branch, Number(user_id));
      if (userObj) {
        return [userObj.nick, stats[user_id]];
      } else {
        return res.status(404).send("User not found")
      }
    })
  );

  res.json(Object.fromEntries(convertedStats));
}

  
module.exports = {
  stats
};