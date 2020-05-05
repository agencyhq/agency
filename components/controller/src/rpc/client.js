const { URL } = require('url')

const log = require('loglevel')
const RPC = require('rpc-websockets')

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
    return p
  }
}

module.exports = new RPCClient()
