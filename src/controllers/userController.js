const { getDB } = require('../config/db');
const Joi = require('joi');
const { formatInitData, isRotaAdmin, statistic } = require('../utils/helpers');
const { usersCache, usersCacheTTL } = require('../cache/usersCache');
const { validateBranch, validateUserId, validateColor, validateInitData } = require('../utils/responseValidation');


const users = async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.query.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  if (! await isRotaAdmin(value.branch, value.initDataUnsafe.user.id)) {
    return res.status(403).send('You must be a rota admin') 
  }

  // Logic
  const mongo_db = getDB();
  const searchQuery = {
    [`roles.rota_${value.branch}`]: {$exists: true},
    'telegram_id': {'$ne': null}
  };
  const userCount = await mongo_db.collection('users').countDocuments(searchQuery);

  if (Object.entries(usersCache[value.branch]).length !== userCount) {
    // Reset cache
    usersCache[value.branch] = {};

    // Fetch data
    const userCursor = mongo_db.collection('users').find(
      searchQuery,
      {projection: {'telegram_id': 1, 'telegram': 1, [`roles.rota_${value.branch}`]: 1, '_id': 0}}
    );
    const userArray = await userCursor.toArray();
    console.log('Users fetched');

    // Save to cache
    for (const user of userArray) {
      usersCache[value.branch][user.telegram_id] = {
        id: user.telegram_id,
        username: user.telegram,
        nick: user?.roles[`rota_${value.branch}`]?.nick ?? userEntry.telegram,
        color: user?.roles[`rota_${value.branch}`]?.c ?? null,
      };

      setTimeout(() => {
        delete usersCache[value.branch][user.telegram_id];
      }, usersCacheTTL);
    }
  }

  res.json(Object.values(usersCache[value.branch]))
};


const removeUser = async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    modifyUserId: validateUserId.required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.body.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  if (! await isRotaAdmin(value.branch, initDataUnsafe.user.id)) {
    res.status(403).send('You must be a rota admin')
    return 
  }

  // Logic
  const mongo_db = getDB();
  const updateUser = await mongo_db.collection('users').updateOne(
    {telegram_id: value.modifyUserId},
    {$unset: {[`roles.rota_${value.branch}`]: null}}
  )

  // Update cache
  delete usersCache[value.branch][value.modifyUserId]

  if (updateUser.matchedCount === 1){
    res.send('ok')
    await statistic(initDataUnsafe, value.branch.toUpperCase(), 'rota-remove-user', {modify: value.modifyUserId})
  } else {
    res.status(404).send("User not found")
  }
};


const updateUser = async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    userObj: Joi.object({
      id: validateUserId.allow(null),
      username: Joi.string(),
      nick: Joi.string().required(),
      color: validateColor
    }).or('id', 'username').required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.body.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  if (! await isRotaAdmin(value.branch, initDataUnsafe.user.id)) {
    res.status(403).send('You must be a rota admin')
    return 
  }

  // Logic
  const mongo_db = getDB();
  let updateUser;
  const updateOptions = {
    projection: {telegram_id: 1, telegram: 1, [`roles.rota_${value.branch}`]: 1, _id: 0},
    returnDocument: 'after'
  };

  if (value.userObj.id) {
    // Update permissions of user with current rota access
    updateUser = await mongo_db.collection('users').findOneAndUpdate(
      {telegram_id: value.userObj.id},
      {
        $set: {
          [`roles.rota_${value.branch}`]: {
            nick: value.userObj.nick,
            c: value.userObj.color
          }
        }
      },
      updateOptions
    )

  } else if (!value.userObj.id && value.userObj.username) {
    // Add rota access to a user in DB
    updateUser = await mongo_db.collection('users').findOneAndUpdate(
      {telegram: value.userObj.username},
      {
        $set: {
          [`roles.rota_${value.branch}`]: {
            nick: value.userObj.nick,
            c: value.userObj.color
          }
        }
      },
      updateOptions
    )
  }

  if (updateUser !== null){
    res.send('ok')
    await statistic(initDataUnsafe, value.branch.toUpperCase(), 'rota-update-user', value.userObj)
  } else {
    return res.status(404).send("User not found")
  }

  // Update cache
  usersCache[value.branch][updateUser.telegram_id] = {
    id: updateUser.telegram_id,
    username: updateUser.telegram,
    nick: updateUser.roles[`rota_${value.branch}`]?.nick ?? updateUser.telegram,
    color: updateUser.roles[`rota_${value.branch}`]?.c ?? 0
  }
};

module.exports = {
  users,
  updateUser,
  removeUser
}