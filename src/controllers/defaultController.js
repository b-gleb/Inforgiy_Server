import Joi from 'joi';
import cache, { longTTL } from '../utils/cache.js';
import makeHelpers from '../utils/helpers.js';
import { validateInitData } from '../utils/initDataValidation.js';

export default function makeDefaultController(database) {
  const helpers = makeHelpers(database);

  /**
    To check if the server is working
  */
  const ping = async (_req, res) => {
    res.send('pong');
  };

  /**
    Authenticate user on the server
    Provide client with parameters important for better UI display
  */
  const auth = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      initDataUnsafe: Joi.any().required()
    });

    const { error } = validationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      return res.status(401).send('Unable to verify hash');
    }

    // Logic
    const rotaAdmin = [];
    const userBranches = {};
    let hasRoles = false;

    const userEntry = await database.getUser(initDataUnsafe.user.id);

    if (userEntry === null) {
      return res.status(404).send('User not found');
    }

    // Obtain array of departments and its properties
    const cacheKey = 'get.departments';
    let departmentArray = cache.get(cacheKey);
    if (departmentArray === undefined) {
      departmentArray = await database.getDepartments();
      cache.set(cacheKey, departmentArray, longTTL);
    }

    // Verify which departments the user has access to
    departmentArray.forEach(departmentEntry => {
      const departmentSlug = departmentEntry.slug;
      const rotaKey = `rota_${departmentSlug}`;
      const adminKey = `admin_rota_${departmentSlug}`;

      // Check for rota keys and add to userBranches if present
      if (userEntry.roles[rotaKey] !== undefined) {
        userBranches[departmentSlug] = {
          color: userEntry.roles[rotaKey]?.c ?? 0,
          maxDuties: departmentEntry.maxDuties
        };

        hasRoles = true;
      }

      // Check for admin keys and add to rotaAdmin if present
      if (userEntry.roles[adminKey] !== undefined) {
        rotaAdmin.push(departmentSlug);
      }
    });

    if (!hasRoles) {
      res.status(403).send('Forbidden');
    } else {
      res.json({ branches: userBranches, rotaAdmin });
    }
  };

  return {
    ping,
    auth
  };
}
