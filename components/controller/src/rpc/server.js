const CircularJSON = require('circular-json')
const RPC = require('rpc-websockets')

class RPCServer extends RPC.Server {
  of (name) {
    const self = this
    return {
      ...super.of(name),
      emitRandomly (event, ...params) {
        const socketIds = [...self.namespaces[name].clients.keys()]

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
