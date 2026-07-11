import { userSchema } from './user.schema.js';

export const rotaSchema = {
  type: 'array',
  minItems: 24,
  maxItems: 24,
  items: {
    type: 'object',
    properties: {
      users: {
        type: 'array',
        items: userSchema,
        description: 'Array of user object for the timeslot'
      },
      label: {
        type: 'string',
        description: 'Display label for the rota slot',
        examples: ['00:00-01:00']
      }
    },
    required: ['users', 'label'],
    additionalProperties: false
  }
};
