export const jwtResponseSchema = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      description: 'Signed JWT to send in the Authorization header'
    },
    tokenType: {
      type: 'string',
      examples: ['Bearer']
    },
    expiresIn: {
      type: 'integer',
      description: 'Token lifetime in seconds',
      examples: [3600]
    }
  },
  additionalProperties: false,
  required: ['accessToken', 'tokenType', 'expiresIn']
};
