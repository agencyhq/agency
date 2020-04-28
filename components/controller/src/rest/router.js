const fs = require('fs')
const path = require('path')

const Ajv = require('ajv')
const openapi = require('@apidevtools/openapi-schemas')
const express = require('express')
const yaml = require('js-yaml')
const log = require('loglevel')

const ajv = new Ajv({ schemaId: 'auto' })
const validateSpec = ajv
  .addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'))
  .compile(openapi.v3)

function routerFactory (filename) {
  const content = fs.readFileSync(path.join(__dirname, filename), 'utf8')
  const spec = yaml.safeLoad(content)

  const valid = validateSpec(spec)
  if (!valid) {
    log.error(validateSpec.errors)
    throw new Error('spec validation failed')
  }

  const router = express.Router()

  for (const path in spec.paths) {
    for (const method in spec.paths[path]) {
      const opId = spec.paths[path][method].operationId
      const operation = require(`./methods/${opId}`)
      router[method](path, operation)
    }
  }

  return router
}

module.exports = routerFactory
