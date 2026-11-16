import { verifyToken } from '../utils/jwt.js';

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).send('No valid authorization header');
  }

  const token = header.slice(7);
  const decoded = verifyToken(token);

  if (decoded === null) {
    return res.status(401).send('Invalid or expired token');
  }

  req.user = decoded;
  next();
};
