import dotenv from 'dotenv';
dotenv.config();
import settup from '../config/settup.json' with { type: 'json' };

import BaseJoi from 'joi';
import joiDate from '@joi/date';
const Joi = BaseJoi.extend(joiDate);

export const validateBranch = Joi.string().valid(...Object.keys(settup));
export const validateUserId = Joi.number().integer().positive();
export const validateColor = Joi.number().integer().min(0).max(6).default(0);

export const validateTimeRange = Joi.string()
  .pattern(/^\d{2}:\d{2}\s?-\s?\d{2}:\d{2}$/)
  .custom((value, helpers) => {
    const hour1 = parseInt(value.slice(0, 2), 10);
    if (hour1 >= 24) {
      return helpers.message('Start hour must be less than 24');
    } else {
      return value;
    }
  });

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
