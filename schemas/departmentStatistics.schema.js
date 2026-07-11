import { dateRangeSchema } from './dateRange.schema.js';

export const departmentStatisticsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      dateRange: dateRangeSchema,
      count: {
        type: 'integer',
        examples: [9]
      }
    },
    additionalProperties: false,
    required: ['dateRange', 'count']
  }
};
