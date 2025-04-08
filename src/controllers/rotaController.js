const { getDB } = require('../config/db');
const { convertListRota } = require('../utils/converters');
const Joi = require('joi');
const { formatInitData, isRotaAdmin, statistic } = require('../utils/helpers');
const { validateBranch, validateUserId, validateInitData } = require('../utils/responseValidation');
const settup = require('../config/settup.json')



const rota = async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    date: Joi.date().max(settup[req.query.branch].maxDate).min(settup[req.query.branch].minDate).required()
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  // Logic
  const mongo_db = getDB();
  // console.log(mongo_db)
  const dayEntry = await mongo_db.collection(`rota_${value.branch}`).findOne({date: value.date});

  if (dayEntry === null){
    return res.status(404).send('Day not found')
  }

  if (['lns', 'gp', 'di', 'orel', 'ryaz'].includes(value.branch)){
      const result = await convertListRota(value.branch, dayEntry?.rota ?? {});
      return res.json(result)
  } else {
      return res.json({})
  }
};


const userDuties = async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    user_id: validateUserId.required(),
    startDate: Joi.date().max(settup[req.query.branch].maxDate).min(settup[req.query.branch].minDate).required(),
    endDate: Joi.date().max(settup[req.query.branch].maxDate).min(settup[req.query.branch].minDate).required()
  }).custom((value, helpers) => {
    if (value.startDate > value.endDate) {
      return helpers.message('startDate must be less than or equal to endDate');
    }
    return value;
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  // Logic
  const mongo_db = getDB();
  const cursor = mongo_db.collection(`rota_${value.branch}`).find(
    {
      '$and': [
        {'date': {'$gte': value.startDate}},
        {'date': {'$lte': value.endDate}}
      ],
      'rota': {'$elemMatch': {'$elemMatch': {'$eq': value.user_id}}}
    },
    {sort: {date: 1}}
  );
  const dayArray = await cursor.toArray();

  const result = [];

  dayArray.forEach(dayEntry => {
    let dayDuties = {date: dayEntry.date, hours: []};

    dayEntry.rota.forEach((timeSlot, index) => {
      if (timeSlot.includes(value.user_id)){
        dayDuties.hours.push(index)
      }
    });

    result.push(dayDuties);
  });

  res.json(result);
};


const updateRota = async (req, res) => {
  // Validation
  const today = new Date();
  let timeIndex;

  const validationSchema = Joi.object({
    type: Joi.string().valid('remove', 'add').required(),
    branch: validateBranch.required(),
    date: Joi.date().max(settup[req.body.branch].maxDate).min(settup[req.body.branch].minDate).required(),
    timeRange: Joi.string().required(),
    modifyUserId: validateUserId.required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.body.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  try {
    timeIndex = Number(value.timeRange.slice(0, 2));
  } catch (error){
    return res.status(400).send("Expect slice(0, 2) of time to be a Number")
  }


  // Logic
  const mongo_db = getDB();
  let updatedDayEntry;

  if (value.type === 'remove'){
    // Only admins can remove users from rota
    if (! isRotaAdmin(value.branch, initDataUnsafe.user.id)){
      return res.status(403).send('You must be rota admin to remove users')
    }

    updatedDayEntry = await mongo_db.collection(`rota_${value.branch}`).findOneAndUpdate(
      {date: value.date},
      {"$pull": {[`rota.${timeIndex}`]: value.modifyUserId}},
      {
        returnDocument: 'after'
      }
    )


  } else if (value.type === 'add'){
    // Only admins can add someone else to rota
    if (value.modifyUserId != initDataUnsafe.user.id && ! isRotaAdmin(value.branch, initDataUnsafe.user.id)){
      return res.status(403).send('You must be rota admin to add someone else')
    }

    dayEntry = await mongo_db.collection(`rota_${value.branch}`).findOne(
      {date: value.date}
    );

    const timeSlot = dayEntry.rota[timeIndex];

    if (!timeSlot.includes(value.modifyUserId)) {
      timeSlot.push(value.modifyUserId);
    };

    updatedDayEntry = await mongo_db.collection(`rota_${value.branch}`).findOneAndUpdate(
      {_id: dayEntry._id},
      {"$set": {[`rota.${timeIndex}`]: timeSlot}},
      {
        returnDocument: 'after'
      }
    );
  }

  if (updatedDayEntry === null){
    res.status(404).send("Date not found")
    return
  } else {
    res.json(await convertListRota(value.branch, updatedDayEntry.rota))
    await statistic(initDataUnsafe, value.branch.toUpperCase(), `rota-${value.type}`, {date: value.date, time: value.timeRange, modify: value.modifyUserId})
    return
  };
};


module.exports = {
  rota,
  updateRota,
  userDuties
};