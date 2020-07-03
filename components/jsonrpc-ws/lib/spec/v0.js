module.exports = {
  type: 'object',
  properties: {
    version: {
      enum: [0]
    },
    info: {
      type: 'object',
      properties: {
        title: {
          type: 'string'
        },
        description: {
          type: 'string'
        },
        version: {
          type: 'string'
        }
      },
      patternProperties: {
        '^x-': {}
      },
      additionalProperties: false
    },
    methods: {
      type: 'object',
      patternProperties: {
        '^[A-Za-z.]+$': {
          type: 'object',
          properties: {
            operationId: {
              type: 'string'
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            parameters: {
              type: 'array',
              items: {
                type: 'object'
                // TODO: validate as JSONSchema
              }
            },
            response: {
              type: 'object'
              // TODO: validate as JSONSchema
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    events: {
      type: 'object',
      patternProperties: {
        '^[A-Za-z.]+$': {
          type: 'object',
          properties: {
            operationId: {
              type: 'string'
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            response: {
              type: 'object'
              // TODO: validate as JSONSchema
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    }
  }
}
