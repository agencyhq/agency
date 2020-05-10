const fs = require('fs')
const http = require('http')
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

function authorizeFactory (securityScope) {
  return (req, res, next) => {
    const { scope } = req.authInfo
    if (securityScope === 'any' || scope === 'all' || securityScope.indexOf(scope) !== -1) {
      return next()
    }

    res.statusCode = 403
    return res.end(http.STATUS_CODES[res.statusCode])
  }
}

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
      const {
        operationId: opId,
        'x-security-scope': securityScope
      } = spec.paths[path][method]

      const authorize = authorizeFactory(securityScope)
      const operation = require(`./methods/${opId}`)

      router[method](path, authorize, operation)
    }
  }

  return router
}

module.exports = routerFactory
