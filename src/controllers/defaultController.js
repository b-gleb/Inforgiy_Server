import Joi from 'joi';
import { formatInitData } from '../utils/helpers.js';
import { validateInitData } from '../utils/initDataValidation.js';
import settup from '../config/settup.json' with { type: 'json' };

export default function makeDefaultController(database) {
  const ping = async (req, res) => {
    res.send('pong')
  };


  const auth = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      initDataUnsafe: Joi.any().required()
    });

    const { error, value } = validationSchema.validate(req.query);
    if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.query.initDataUnsafe);
  if (!validateInitData(initDataUnsafe)) {
    res.status(401).send('Unable to verify hash');
    return;
  };


    // Logic
    let rotaAdmin = [];
    let userBranches = {};
    let hasRoles = false;

    const userEntry = await database.getUser(initDataUnsafe.user.id);

    if (userEntry === null){
      res.status(404).send("User not found")
      return
    }

    Object.keys(settup).forEach(branch => {
      const rotaKey = `rota_${branch}`;
      const adminKey = `admin_rota_${branch}`;

      // Check for rota keys and add to userBranches if present
      if (userEntry.roles[rotaKey] !== undefined) {
        userBranches[branch] = {
          color: userEntry.roles[rotaKey],
          maxDuties: settup[branch].maxDuties
        };

        hasRoles = true;
      }

      // Check for admin keys and add to rotaAdmin if present
      if (userEntry.roles[adminKey] !== undefined) {
        rotaAdmin.push(branch);
      }
    });


    if (! hasRoles){
      res.status(403).send("Forbidden")
    } else {
      res.json({branches: userBranches, rotaAdmin: rotaAdmin})
    }

  };

  return {
    ping,
    auth
  };
};
