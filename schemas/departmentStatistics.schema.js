import { dateRangeSchema } from './dateRange.schema.js';

export const departmentStatisticsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      dateRange: dateRangeSchema,
      count: {
        type: 'integer',
        example: 9
      }
    },
    additionalProperties: false,
    required: ['dateRange', 'count']
  }
};
