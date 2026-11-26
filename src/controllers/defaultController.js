import Joi from 'joi';
import makeHelpers from '../utils/helpers.js';
import { validateInitData } from '../utils/initDataValidation.js';
import { signToken } from '../utils/jwt.js';

export default function makeDefaultController(database) {
  const helpers = makeHelpers(database);

  /**
    To check if the server is working
  */
  const ping = async (_req, res) => {
    res.send('pong');
  };

  /**
    Authenticate user and issue a signed JWT
  */
  const telegramWebappAuth = async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      initDataUnsafe: Joi.any().required()
    });

    const { error } = validationSchema.validate(req.body ?? {});
    if (error) return res.status(400).send(error.details[0].message);

    const initDataUnsafe = helpers.formatInitData(req.body.initDataUnsafe);
    if (!validateInitData(initDataUnsafe)) {
      return res.status(401).send('Unable to verify initDataUnsafe');
    }

    // Logic
    const userEntry = await database.getUser(initDataUnsafe.user.id);

    if (userEntry === null) {
      return res.status(404).send('User not found');
    }

    const hasRotaAccess = Object.keys(userEntry?.roles || {}).some(
      key => key.startsWith('rota_') || key.startsWith('admin_rota_')
    );

    if (hasRotaAccess === false) {
      return res.status(403).send('Not authorized to view rota');
    }

    const accessToken = signToken({
      id: initDataUnsafe.user.id,
      username: initDataUnsafe.user?.username ?? null
    });

    res.json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    });
  };

  return {
    ping,
    telegramWebappAuth
  };
}
