import Joi from 'joi';
import cache, { longTTL } from '../utils/cache.js';
import makeHelpers from '../utils/helpers.js';
import { validateInitData } from '../utils/initDataValidation.js';
import {
  validateBranch,
  validateColor,
  validateUserId
} from '../utils/responseValidation.js';

export default function makeUserController(database) {
  const helpers = makeHelpers(database);

  const users = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      initDataUnsafe: Joi.any().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      return res.status(401).send('Unable to verify hash');
    }

    if (!(await helpers.isRotaAdmin(value.branch, value.initDataUnsafe.user.id))) {
      return res.status(403).send('You must be a rota admin');
    }

    // Logic
    const cacheKey = `get.users.${value.branch}`;
    let userArray = cache.get(cacheKey);

    if (userArray === undefined) {
      const userEntries = await database.getBranchUsers(value.branch);

      userArray = userEntries.map(user => ({
        id: user.telegram_id,
        username: user.telegram,
        nick: user?.roles[`rota_${value.branch}`]?.nick ?? user.telegram,
        color: user?.roles[`rota_${value.branch}`]?.c ?? null
      }));

      // currently only saving all users to cache not individual ones, maybe needs changing
      cache.set(cacheKey, userArray, longTTL);
    }

    res.json(userArray);
  };

  const removeUser = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      userId: validateUserId.required(),
      initDataUnsafe: Joi.any().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      return res.status(401).send('Unable to verify hash');
    }

    if (!(await helpers.isRotaAdmin(value.branch, initDataUnsafe.user.id))) {
      return res.status(403).send('You must be a rota admin');
    }

    // Logic
    const removedUser = await database.removeUserPermission(value.branch, value.userId);

    // Update cache
    delete usersCache[value.branch][value.userId];

    if (removedUser.matchedCount === 1) {
      res.sendStatus(204);
      await helpers.statistic(
        initDataUnsafe,
        value.branch.toUpperCase(),
        'rota-remove-user',
        { modify: value.userId }
      );
    } else {
      res.status(404).send('User not found');
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
      })
        .or('id', 'username')
        .required(),
      initDataUnsafe: Joi.any().required()
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      return res.status(401).send('Unable to verify hash');
    }

    if (!(await helpers.isRotaAdmin(value.branch, initDataUnsafe.user.id))) {
      return res.status(403).send('You must be a rota admin');
    }

    // Logic
    let updatedUser;

    if (value.userObj.id) {
      // Update permissions of user with current rota access
      updatedUser = await database.updateUser(
        value.branch,
        value.userObj.id,
        value.userObj.nick,
        value.userObj.color
      );
    } else if (!value.userObj.id && value.userObj.username) {
      // Add rota access to a user in DB
      updatedUser = await database.addUserPermission(
        value.branch,
        value.userObj.username,
        value.userObj.nick,
        value.userObj.color
      );
    }

    let userObj;

    if (updatedUser !== null) {
      userObj = {
        id: updatedUser.telegram_id,
        username: updatedUser.telegram,
        nick: updatedUser.roles[`rota_${value.branch}`]?.nick ?? updatedUser.telegram,
        color: updatedUser.roles[`rota_${value.branch}`]?.c ?? 0
      };

      res.json(userObj);
      await helpers.statistic(
        initDataUnsafe,
        value.branch.toUpperCase(),
        'rota-update-user',
        value.userObj
      );
    } else {
      return res.status(404).send('User not found');
    }

    // Update cache
    usersCache[value.branch][updatedUser.telegram_id] = userObj;
  };

  return {
    users,
    removeUser,
    updateUser
  };
}
