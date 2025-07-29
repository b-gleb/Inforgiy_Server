import Joi from 'joi'
import { validateBranch, validateUserId, validateDateRange } from '../utils/responseValidation.js';
import { convertUserId } from '../utils/converters.js';
import { fillMissingDates } from '../utils/helpers.js';

export default function makeStatController(database) {
  const stats = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      // TODO: change user_ids to userIds (may require client side change)
      user_ids: Joi.array().min(1).items(validateUserId).required(),
      dateRanges: Joi.array().min(1).items(validateDateRange).required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Logic
    const stats = {};

    for (const dateRange of value.dateRanges){
      const pipeline_output = await database.getDateRangeStats(
        value.branch,
        value.user_ids,
        dateRange
      );

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


  const stats_cumulative = async (req, res) => {
    // TODO: Account for user not found
    // Validation
      const validationSchema = Joi.object({
        branch: validateBranch.required(),
        // TODO: change user_ids to userIds (may require client side change)
        user_id: validateUserId.required(),
        dateRanges: Joi.array().min(1).items(validateDateRange).required()
      });

      const { error, value } = validationSchema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      // Logic
      const result = [];

      for (const dateRange of value.dateRanges){
        const pipeline_output = await database.getCummulativeStats(
          value.branch,
          value.user_id,
          dateRange
        );

        result.push({
          user_id: value.user_id,
          dateRange: dateRange,
          data: fillMissingDates(pipeline_output, dateRange[0], dateRange[1])
        });
        
      }

      res.json(result);
  };


  return {
    stats,
    stats_cumulative
  };
};