const path = require('path')
const util = require('util')

const log = require('loglevel')
const metrics = require('@agencyhq/agency-metrics')
const Prometheus = require('prom-client')
const RPC = require('@agencyhq/jsonrpc-ws')

const pubsub = require('../pubsub')

const connectionGauge = new Prometheus.Gauge({
  name: 'ifttt_rpc_clients',
  help: 'Gauge for number of clients currently connected via RPC'
})

async function handleMessage (type, rpc, msg) {
  const content = JSON.parse(msg.content.toString())
  metrics.countMessages(type, content)
  log.debug('reciving %s: %s', msg.fields.routingKey, util.inspect(content))

  await rpc.notify(type, content)

  log.debug('acknowledge reciving %s: %s', msg.fields.routingKey, content.id)
  pubsub.channel.ack(msg)
}

class RPCServer extends RPC.Server {
  constructor (...args) {
    super(...args)

    this.registerSpec(path.join(__dirname, '../rpcapi.yaml'), (method, { operationId }) => {
      if (!operationId) {
        return () => {
          throw new Error('Not implemented')
        }
      }

      return require(path.join(__dirname, './methods', operationId))
    }, (event, { operationId }) => {
      pubsub.subscribe(operationId, msg => handleMessage(event, this, msg), {
        name: false,
        exclusive: true
      })
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
