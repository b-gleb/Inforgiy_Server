import Joi from 'joi'
import { validateBranch, validateUserId, validateDateRange } from '../utils/responseValidation.js';
import makeCoverters from '../utils/converters.js';
import makeHelpers from '../utils/helpers.js';

export default function makeStatController(database) {
  const converters = makeCoverters(database);
  const helpers = makeHelpers(database);

  const stats = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      userIds: Joi.array().min(1).items(validateUserId).required(),
      dateRanges: Joi.array().min(1).items(validateDateRange).required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Logic
    const stats = {};

    for (const dateRange of value.dateRanges){
      const pipeline_output = await database.getDateRangeStats(
        value.branch,
        value.userIds,
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

      // Identify userIds not returned and fill them with zero
      const notReturnedUserIds = value.userIds.filter(userId => !returnedUserIds.includes(userId));
      for (const userId of notReturnedUserIds) {
        (stats[userId] ??= []).push({
          dateRange: dateRange,
          count: 0
        })
      }
    };

    // Conver userIds to nick names
    const allUserIds = Object.keys(stats);
    const convertedStats = [];

    for (const userId of allUserIds) {
      const userObj = await converters.convertUserId(value.branch, Number(userId));

      if (!userObj) {
        return res.status(404).send(`User not found (ID: ${userId})`);
      }
      else {
        const {id, nick, color} = userObj;
        convertedStats.push({
          user: {id, nick, color},
          data: stats[userId]
        })
      };
    };

    res.json(convertedStats);
  };


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
          data: helpers.fillMissingDates(pipeline_output, dateRange[0], dateRange[1])
        });
        
      }

      res.json(result);
  };


  const emptyDuties = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      dateRanges: Joi.array().min(1).items(validateDateRange).required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Logic
    const pipeline_output = await database.getEmptyDuties(value.branch, value.dateRanges);
    console.log(pipeline_output)
  
    const result = value.dateRanges.map((range, idx) => ({
      dateRange: range,
      count: pipeline_output[`range_${idx}`][0].count
    }));

    res.json(result);
  };


  return {
    stats,
    stats_cumulative,
    emptyDuties,
  };
};