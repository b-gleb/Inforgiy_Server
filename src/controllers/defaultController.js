import Joi from 'joi';
import settup from '../config/settup.json' with { type: 'json' };
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

    Object.keys(settup).forEach(branch => {
      const rotaKey = `rota_${branch}`;
      const adminKey = `admin_rota_${branch}`;

      // Check for rota keys and add to userBranches if present
      if (userEntry.roles[rotaKey] !== undefined) {
        userBranches[branch] = {
          color: userEntry.roles[rotaKey]?.c ?? 0,
          maxDuties: settup[branch].maxDuties
        };

        hasRoles = true;
      }

      // Check for admin keys and add to rotaAdmin if present
      if (userEntry.roles[adminKey] !== undefined) {
        rotaAdmin.push(branch);
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
