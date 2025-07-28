import dotenv from 'dotenv';
dotenv.config();

import BaseJoi from 'joi';
import joiDate from '@joi/date';
const Joi = BaseJoi.extend(joiDate);

import crypto from 'crypto';
import settup from '../config/settup.json' with { type: 'json' };


// Simple Validation
export const validateBranch = Joi.string().valid(...Object.keys(settup));
export const validateUserId = Joi.number().integer().positive();
export const validateColor = Joi.number().integer().min(0).max(6).default(0);

// Complex Validation
export const validateDateRange = Joi.array()
  .length(2)
  .items(
    Joi.date().format('YYYY-MM-DD').utc().required(),
    Joi.date().format('YYYY-MM-DD').utc().required()
  )
  .custom((value, helpers) => {
    if (value[0] > value[1]) {
      return helpers.message('startDate must be less than or equal to endDate');
    }
    return value;
  });


export const validateInitData = (res, initDataUnsafe) => {
  const unixTime = Math.floor(Date.now() / 1000);

  if (process.env.ENV === 'PROD' && (unixTime - 3600) > initDataUnsafe.auth_date){
    res.status(401).send('Authorization expired')
    return false
  }

  const { hash, ...rest } = initDataUnsafe;

  const dataCheckString = Object.entries(rest).sort().map(([k, v]) => {
      if (typeof v === "object" && v !== null) {
          v = JSON.stringify(v);
      }

      if (typeof v === "string" && /(https?:\/\/[^\s]+)/.test(v)) {
          v = v.replace(/\//g, "\\/");
      }
      
      return `${k}=${v}`;
  }).join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(process.env.TOKEN);
  const calculatedHash = crypto.createHmac("sha256", secret.digest()).update(dataCheckString).digest("hex");
  
  if (calculatedHash === hash){
    return true
  } else {
    res.status(401).send('Unable to verify hash')
    return false
  }
};
