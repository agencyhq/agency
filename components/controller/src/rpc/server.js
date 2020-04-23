const fs = require('fs')
const path = require('path')

const Ajv = require('ajv')
const CircularJSON = require('circular-json')
const RPC = require('rpc-websockets')
const yaml = require('js-yaml')

const ajv = new Ajv()
const validateSpec = ajv.compile(require('./spec/v0'))

class RPCServer extends RPC.Server {
  registerSpec (filename) {
    const content = fs.readFileSync(path.join(__dirname, filename), 'utf8')
    const spec = yaml.safeLoad(content)

    if (spec.version !== 0) {
      throw new Error('unsupported version of rpc spec')
    }

    const valid = validateSpec(spec)
    if (!valid) {
      throw new Error('spec validation failed')
    }

    for (const method in spec.methods) {
      const {
        operationId,
        namespaces = ['/']
        // TODO: start checking for parameters
      } = spec.methods[method]

      const operation = require(`./methods/${operationId}`)

      for (const namespace of namespaces) {
        this.of(namespace).register(method, operation)
      }
    }

    for (const event in spec.events) {
      const {
        namespaces = ['/']
      } = spec.events[event]

      for (const namespace of namespaces) {
        this.of(namespace).event(event)
      }
    }
  }

  of (name) {
    const self = this
    return {
      ...super.of(name),
      emitRandomly (event, ...params) {
        const socketIds = [...self.namespaces[name].clients.keys()]

        if (!socketIds.length) {
          return
        }

        const randomId = socketIds[Math.floor(Math.random() * socketIds.length)]
        self.namespaces[name].clients.get(randomId).send(CircularJSON.stringify({
          notification: event,
          params: params || []
        }))
      }
    }
  }
}

module.exports = RPCServer
