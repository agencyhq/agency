const log = require('loglevel')
const Prometheus = require('prom-client')
const RPC = require('@agencyhq/jsonrpc-ws')

const rpcMessagesCounter = new Prometheus.Counter({
  name: 'ifttt_rpc_messages_received',
  help: 'Counter for number of rpc messages received'
})

const rpcRequestDuration = new Prometheus.Histogram({
  name: 'ifttt_rpc_request_duration',
  help: 'Duration of rpc request in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
  labelNames: ['method', 'status']
})

class RPCClient extends RPC.Client {
  constructor () {
    super(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')
  }

  async connect (...args) {
    await super.connect(...args)

    this.ws.on('message', m => {
      rpcMessagesCounter.inc()
      log.debug('rpc message received:', m)
    })
  }

  async call (method, ...args) {
    const rpcRequestDurationEnd = rpcRequestDuration.startTimer({ method })
    try {
      const v = await super.call(method, ...args)
      rpcRequestDurationEnd({ status: 'resolved' })
      return v
    } catch (e) {
      rpcRequestDurationEnd({ status: 'rejected' })
      throw e
    }
  }
}

module.exports = new RPCClient()
