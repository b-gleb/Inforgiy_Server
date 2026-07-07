export const userSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
      description: 'Unique identifier on Telegram',
      minimum: 0,
      examples: [1234567890]
    },
    username: {
      type: 'string',
      pattern: '^@\\S+$',
      description: 'Username on Telegram',
      examples: ['@b_gleb'],
      description: 'username field description'
    },
    nick: {
      type: 'string',
      description: 'User\s short name of callsign. Used as a display name in the rota',
      examples: ['Глеб']
    },
    color: {
      type: 'integer',
      description: 'Integer code for user\s display colour',
      minimum: 0,
      maximum: 6,
      examples: [6]
    }
  },
  required: ['id', 'username', 'nick', 'color'],
  additionalProperties: false
};
