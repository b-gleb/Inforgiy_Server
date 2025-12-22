import Joi from 'joi';
import makeCoverters from '../utils/converters.js';
import makeHelpers from '../utils/helpers.js';
import { validateInitData } from '../utils/initDataValidation.js';
import {
  validateBranch,
  validateUserId,
  validateTimeRange,
  validateDayOfWeekArray,
  validateTimeRangeArray,
  validateStartDateBeforeEndDate,
  ensureUniqueArray
} from '../utils/responseValidation.js';

export default function makeRotaController(database) {
  const converters = makeCoverters(database);
  const helpers = makeHelpers(database);

  /**
    Retreives rota information for a particilar day
  */
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

    if (dayEntry === null) {
      return res.status(404).send('Day not found');
    }

    if (['lns', 'gp', 'di', 'orel', 'ryaz'].includes(value.branch)) {
      const result = await converters.convertListRota(
        value.branch,
        dayEntry?.rota ?? {}
      );
      return res.json(result);
    } else {
      return res.json({});
    }
  };

  const userDuties = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      userId: validateUserId.required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required()
    }).custom(validateStartDateBeforeEndDate);

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
      let dayDuties = { date: dayEntry.date, hours: [] };

      dayEntry.rota.forEach((timeSlot, index) => {
        if (timeSlot.includes(value.userId)) {
          dayDuties.hours.push(index);
        }
      });

      result.push(dayDuties);
    });

    res.json(result);
  };

  /**
    Updates rota for a particilar day
  */
  const updateRota = async (req, res) => {
    // Validation
    let timeIndex;

    const validationSchema = Joi.object({
      type: Joi.string().valid('remove', 'add').required(),
      branch: validateBranch.required(),
      date: Joi.date().required(),
      timeRange: validateTimeRange.required(),
      userId: validateUserId.required(),
      initDataUnsafe: Joi.any().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      return res.status(401).send('Unable to verify hash');
    }

    try {
      timeIndex = Number(value.timeRange.slice(0, 2));
    } catch (error) {
      return res.status(400).send('Expect slice(0, 2) of time to be a Number');
    }

    // Logic
    let updatedDayEntry;
    let dayEntry = await database.getRota(value.branch, value.date);

    if (dayEntry === null) {
      return res.status(404).send('Date not found');
    }

    const isAdmin = await helpers.isRotaAdmin(
      value.branch,
      initDataUnsafe.user.id
    );

    if (value.type === 'remove') {
      // Only admins can remove users from rota
      if (!isAdmin) {
        return res.status(403).send('You must be rota admin to remove users');
      }

      updatedDayEntry = await database.removeUserFromRota(
        value.branch,
        dayEntry._id,
        timeIndex,
        value.userId
      );
    } else if (value.type === 'add') {
      // Return status 404 when atempting to add user not in rota
      if (! await helpers.isUserInBranch(value.branch, value.userId)) {
        return res.status(404).send('User is not assigned to this rota');
      }

      // Only admins can add someone else to rota
      if (value.userId != initDataUnsafe.user.id && !isAdmin) {
        return res
          .status(403)
          .send('You must be rota admin to add someone else');
      }

      const timeSlot = dayEntry.rota[timeIndex];

      if (!timeSlot.includes(value.userId)) {
        timeSlot.push(value.userId);
      }

      updatedDayEntry = await database.addUserToRota(
        value.branch,
        dayEntry._id,
        timeIndex,
        timeSlot
      );
    }

    res.json(
      await converters.convertListRota(
        value.branch,
        updatedDayEntry?.rota ?? {}
      )
    );

    await helpers.statistic(
      initDataUnsafe,
      value.branch.toUpperCase(),
      `rota-${value.type}`,
      { date: value.date, time: value.timeRange, modify: value.userId }
    );
    return;
  };

  /**
    Adds user to the same timeslot(s) across date range
  */
  const addRotaMulti = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      timeRanges: validateTimeRangeArray.custom(ensureUniqueArray).required(),
      daysOfWeek: validateDayOfWeekArray.custom(ensureUniqueArray).required(),
      userId: validateUserId.required(),
      allowOccupiedSlots: Joi.bool().default(true),
      initDataUnsafe: Joi.any().required()
    }).custom(validateStartDateBeforeEndDate);

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) return res.status(401).send('Unable to verify hash');

    const isAdmin = await helpers.isRotaAdmin(value.branch, initDataUnsafe.user.id);
    if (!isAdmin) return res.status(403).send('You must be a rota admin to multi add users to rota');

    const userInBranch = await helpers.isUserInBranch(value.branch, value.userId);
    if (!userInBranch) return res.status(404).send('User to add to rota is not found');

    // Logic
    const hours = value.timeRanges.map(range => Number(range.slice(0, 2)));

    const updateObj = await database.addUserToRotaMulti({
      branch: value.branch,
      userId: value.userId,
      startDate: value.startDate,
      endDate: value.endDate,
      daysOfWeek: value.daysOfWeek,
      hours: hours,
      allowOccupiedSlots: value.allowOccupiedSlots
    });

    res.json({ modifiedCount: updateObj.modifiedCount });

    await helpers.statistic(
      initDataUnsafe,
      value.branch.toUpperCase(),
      'rota-add-multi',
      value
    );
  };

  /**
    Removes user from the same timeslot(s) across date range
  */
  const removeRotaMulti = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      timeRanges: validateTimeRangeArray.custom(ensureUniqueArray).required(),
      daysOfWeek: validateDayOfWeekArray.custom(ensureUniqueArray).required(),
      userId: validateUserId.required(),
      initDataUnsafe: Joi.any().required()
    }).custom(validateStartDateBeforeEndDate);

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) return res.status(401).send('Unable to verify hash');

    const isAdmin = await helpers.isRotaAdmin(value.branch, initDataUnsafe.user.id);
    if (!isAdmin) return res.status(403).send('You must be a rota admin to multi add users to rota');

    // Logic
    const hours = value.timeRanges.map(range => Number(range.slice(0, 2)));

    const updateObj = await database.removeUserFromRotaMulti({
      branch: value.branch,
      userId: value.userId,
      startDate: value.startDate,
      endDate: value.endDate,
      daysOfWeek: value.daysOfWeek,
      hours: hours
    });

    res.json({ modifiedCount: updateObj.modifiedCount });

    await helpers.statistic(
      initDataUnsafe,
      value.branch.toUpperCase(),
      'rota-remove-multi',
      value
    );
  };

  return {
    rota,
    userDuties,
    updateRota,
    addRotaMulti,
    removeRotaMulti
  };
}
