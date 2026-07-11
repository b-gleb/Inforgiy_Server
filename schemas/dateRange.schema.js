export const dateRangeSchema = {
  type: 'array',
  minItems: 2,
  maxItems: 2,
  items: {
    type: 'string',
    format: 'date-time'
  },
  examples: [['2025-01-01', '2025-01-31']]
};
