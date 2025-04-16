import { getDB } from '../config/db.js';
import Joi from 'joi';
import { formatInitData } from '../utils/helpers.js';
import { validateInitData } from '../utils/responseValidation.js';
import settup from '../config/settup.json' with { type: 'json' };


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
  if (! validateInitData(res, initDataUnsafe)){return}


  // Logic
  const mongo_db = getDB();
  let rotaAdmin = [];
  let userBranches = {};
  let hasRoles = false;

  const userEntry = await mongo_db.collection('users').findOne(
    {telegram_id: initDataUnsafe.user.id},
    {projection: {roles: 1}}
  );

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
          maxDuties: settup[branch].maxDuties,
          minDate: settup[branch].minDate,
          maxDate: settup[branch].maxDate
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

export default {
  ping,
  auth
};
