const path = require('path')

const log = require('loglevel')
const Prometheus = require('prom-client')
const RPC = require('@agencyhq/jsonrpc-ws')

const connectionGauge = new Prometheus.Gauge({
  name: 'ifttt_rpc_clients',
  help: 'Gauge for number of clients currently connected via RPC'
})

class RPCServer extends RPC.Server {
  constructor (...args) {
    super(...args)

    this.registerSpec(path.join(__dirname, '../rpcapi.yaml'), opId => {
      return require(path.join(__dirname, './methods', opId))
    })

    this.wss.on('connection', (ws, req) => {
      log.debug('client connected to rpc: %s', ws._id)
      connectionGauge.set(this.wss.clients.size)

      ws.on('close', () => {
        log.debug('client disconnected from rpc: %s', ws._id)
        connectionGauge.set(this.wss.clients.size)
      })
    })

    this.wss.on('listening', () => {
      log.debug('rpc server starts listening')
    })

    this.wss.on('close', () => {
      log.debug('rpc server is closing')
    })
  }
}

module.exports = RPCServer
