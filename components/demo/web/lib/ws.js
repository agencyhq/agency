import RPCClient from '@agencyhq/jsonrpc-ws/lib/client'
import WebSocket from 'x-platform-ws'

export default new RPCClient(`ws://${location.hostname}:1234/api`, { WebSocket })
