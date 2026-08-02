export const departmentSlug = {
  type: 'string',
  description: 'Unique identifier of the department',
  enum: ['lns', 'di', 'gp', 'orel', 'ryaz']
};

export const departmentSchema = {
  type: 'object',
  properties: {
    slug: departmentSlug,
    name: {
      type: 'string',
      description: 'Department name',
      examples: ['ЛНС']
    },
    maxDuties: {
      type: 'integer',
      minimum: 0,
      description: 'Maximum number of duties allowed for the department',
      examples: [3]
    }
  },
  required: ['slug', 'name', 'maxDuties'],
  additionalProperties: false
};
