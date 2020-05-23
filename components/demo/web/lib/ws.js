const RPCClient = require('@agencyhq/jsonrpc-ws/lib/client')
const WebSocket = require('x-platform-ws')

module.exports = window.ws = new RPCClient(`ws://${location.hostname}:1234/api`, { WebSocket })
