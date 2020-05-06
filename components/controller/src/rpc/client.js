const { URL } = require('url')

const log = require('loglevel')
const Prometheus = require('prom-client')
const RPC = require('rpc-websockets')

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
    super(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/', {
      autoconnect: false
    })
  }

  connect (namespace) {
    if (namespace) {
      this.address = new URL(namespace, this.address).toString()
    }
    log.debug('connecting to RPC server', this.address)
    const p = new Promise((resolve, reject) => {
      this.once('open', resolve)
      this.once('error', reject)
    })
      .then(() => {
        log.debug('connected to RPC server', this.address)
      })
      .catch(e => {
        throw new Error(`error connecting to RPC server: ${e.message}`)
      })
    super.connect()
    this.socket.addEventListener('message', m => {
      rpcMessagesCounter.inc()
      log.debug('rpc message received:', m.data)
    })
    return p
  }

  call (method, ...args) {
    const rpcRequestDurationEnd = rpcRequestDuration.startTimer({ method })
    return super.call(method, ...args)
      .then(v => {
        rpcRequestDurationEnd({ status: 'resolved' })
        return v
      })
      .catch(e => {
        rpcRequestDurationEnd({ status: 'rejected' })
        throw e
      })
  }
}

module.exports = new RPCClient()
