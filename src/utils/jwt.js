import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

export const signToken = payload => {
  return jwt.sign(payload, process.env.TOKEN, {
    expiresIn: '1h',
    audience: 'inforgiy-web'
  });
};

export const verifyToken = token => {
  try {
    return jwt.verify(token, process.env.TOKEN, {
      audience: 'inforgiy-web',
      clockTolerance: 5
    });
  } catch {
    return null;
  }
};
