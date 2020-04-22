const { URL } = require('url')

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
    const p = new Promise(resolve => {
      this.once('open', resolve)
    })
    super.connect()
    return p
  }
}

module.exports = new RPCClient()
