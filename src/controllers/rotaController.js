import Joi from 'joi';
import makeCoverters from '../utils/converters.js';
import makeHelpers from '../utils/helpers.js';
import { isRotaAdmin } from '../utils/checkRotaAdmin.js';
import { validateInitData } from '../utils/initDataValidation.js';
import { validateBranch, validateUserId, validateTimeRange } from '../utils/responseValidation.js';

export default function makeRotaController(database) {
  const converters = makeCoverters(database);
  const helpers = makeHelpers(database);

  const rota = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      date: Joi.date().required()
    });

    const { error, value } = validationSchema.validate(req.query);
    if (error) return res.status(400).send(error.details[0].message);

    // Logic
    const dayEntry = await database.getRota(value.branch, value.date);

    if (dayEntry === null){
      return res.status(404).send('Day not found')
    };

    if (['lns', 'gp', 'di', 'orel', 'ryaz'].includes(value.branch)){
        const result = await converters.convertListRota(value.branch, dayEntry?.rota ?? {});
        return res.json(result)
    } else {
        return res.json({})
    };
  };


  const userDuties = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      userId: validateUserId.required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required()
    }).custom((value, helpers) => {
      if (value.startDate > value.endDate) {
        return helpers.message('startDate must be less than or equal to endDate');
      }
      return value;
    });

    const { error, value } = validationSchema.validate(req.query);
    if (error) return res.status(400).send(error.details[0].message);

    // Logic
    const dayArray = await database.getUserDuties(
      value.branch,
      value.userId,
      value.startDate,
      value.endDate
    );

    const result = [];

    dayArray.forEach(dayEntry => {
      let dayDuties = {date: dayEntry.date, hours: []};

      dayEntry.rota.forEach((timeSlot, index) => {
        if (timeSlot.includes(value.userId)){
          dayDuties.hours.push(index)
        }
      });

      result.push(dayDuties);
    });

    res.json(result);
  };


  const updateRota = async (req, res) => {
    // TODO: add modifyUserId not found check
    // Validation
    let timeIndex;

    const validationSchema = Joi.object({
      type: Joi.string().valid('remove', 'add').required(),
      branch: validateBranch.required(),
      date: Joi.date().required(),
      timeRange: validateTimeRange.required(),
      modifyUserId: validateUserId.required(),
      initDataUnsafe: Joi.any().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      res.status(401).send('Unable to verify hash');
      return;
    };

    try {
      timeIndex = Number(value.timeRange.slice(0, 2));
    } catch (error){
      return res.status(400).send("Expect slice(0, 2) of time to be a Number")
    }


    // Logic
    let updatedDayEntry;
    let dayEntry = await database.getRota(value.branch, value.date);

    if (dayEntry === null) {
      res.status(404).send("Date not found");
      return;
    }

    if (value.type === 'remove'){
      // Only admins can remove users from rota
      if (! isRotaAdmin(value.branch, initDataUnsafe.user.id)){
        return res.status(403).send('You must be rota admin to remove users');
      };

      updatedDayEntry = await database.removeUserFromRota(
        value.branch,
        dayEntry._id,
        timeIndex,
        value.modifyUserId
      );

    } else if (value.type === 'add') {
      // Only admins can add someone else to rota
      if (value.modifyUserId != initDataUnsafe.user.id && ! isRotaAdmin(value.branch, initDataUnsafe.user.id)){
        return res.status(403).send('You must be rota admin to add someone else');
      }

      const timeSlot = dayEntry.rota[timeIndex];

      if (!timeSlot.includes(value.modifyUserId)) {
        timeSlot.push(value.modifyUserId);
      };

      updatedDayEntry = await database.addUserToRota(
        value.branch,
        dayEntry._id,
        timeIndex,
        timeSlot
      );
    };

    res.json(await converters.convertListRota(value.branch, updatedDayEntry?.rota ?? {}));
    await helpers.statistic(initDataUnsafe, value.branch.toUpperCase(), `rota-${value.type}`, {date: value.date, time: value.timeRange, modify: value.modifyUserId});
    return;
  };

  return {
    rota,
    userDuties,
    updateRota
  };
};
