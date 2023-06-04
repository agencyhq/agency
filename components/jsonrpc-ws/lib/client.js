import once from 'events.once'
import EventEmitter from 'events'

import WS from 'ws'

function deferred (timeout) {
  const defer = {}

  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })

  if (timeout) {
    defer.timeout = setTimeout(() => {
      defer.reject(new Error('timeout'))
    }, timeout)
  }

  return defer
}

export default class RPCClient extends EventEmitter {
  /**
   * @param {string} address
   * @param {object} [opts]
   * @param {number} [opts.heartbeatTimeout]
   * @param {number} [opts.callTimeout]
   *
   * @memberof RPCClient
   */

  constructor (address, opts) {
    super()

    this.authenticated = false
    this.scopes = []
    this.subscriptions = {}
    this.rpcId = 1
    this.queue = {}

    this.address = address
    this.opts = {
      heartbeatTimeout: 30000,
      callTimeout: 1000,
      ...opts
    }
  }

  isConnected () {
    return !!this.ws && this.ws.readyState === WS.OPEN
  }

  async connect () {
    if (this.ws) {
      throw new Error('websocket already instantiated')
    }

    const {
      WebSocket = WS,
      heartbeatTimeout,
      wsOpts
    } = this.opts

    this.ws = new WebSocket(this.address, wsOpts)

    const heartbeat = () => {
      clearTimeout(this.pingTimeout)

      this.pingTimeout = setTimeout(async () => {
        this.emit('heartbeat-missed')
        await this.ws.terminate()
      }, heartbeatTimeout)
    }

    this.ws.on('open', heartbeat)
    this.ws.on('ping', heartbeat)
    this.ws.on('close', () => {
      clearTimeout(this.pingTimeout)

      this.emit('disconnected')

      this.ws = null
    })

    this.ws.on('message', m => this._handleMessage(m))

    await once(this.ws, 'open')

    this.emit('connected')
  }

  async close () {
    if (!this.isConnected()) {
      return
    }

    this.ws.close()

    await once(this.ws, 'close')
  }

  async _send (message) {
    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(message), {}, err => err ? reject(err) : resolve())
    })
  }

  async auth (params) {
    const identity = await this.call('rpc.login', params)

    if (identity) {
      this.authenticated = true
      this.user = identity.user
      this.scopes = new Set(identity.scopes || [])
      this.emit('authenticated', identity)
    }

    return identity
  }

  async call (method, params, opts) {
    if (!this.isConnected()) {
      throw new Error('not connected')
    }

    const {
      timeout,
      become
    } = opts || {}
    const id = this.generateId(method, params, opts)

    const { reject, promise } = this.queue[id] = deferred(timeout || this.opts.callTimeout)

    const message = {
      jsonrpc: '2.0',
      method,
      id
    }

    if (params) {
      message.params = params
    }

    if (become) {
      message['x-agency-become'] = become
    }

    try {
      await this._send(message)
    } catch (e) {
      reject(e)
    }

    const result = await promise

    return result
  }

  async notify (method, params) {
    if (!this.isConnected()) {
      throw new Error('not connected')
    }

    const message = {
      jsonrpc: '2.0',
      method
    }

    if (params) {
      message.params = params
    }

    await this._send(message)
  }

  async subscribe (method, fn) {
    const res = await this.call('rpc.on', [method])

    if (res[method] !== 'ok') {
      throw new Error(`error subscribing: ${res[method]}`)
    }

    if (!this.subscriptions[method]) {
      this.subscriptions[method] = []
    }

    const index = this.subscriptions[method].indexOf(fn)

    if (index === -1) {
      this.subscriptions[method] = this.subscriptions[method].concat(fn)
    }

    return res
  }

  async unsubscribe (method, fn) {
    const res = await this.call('rpc.off', [method])

    if (!this.subscriptions[method]) {
      return
    }

    const index = this.subscriptions[method].indexOf(fn)

    if (index !== -1) {
      this.subscriptions[method].splice(index, 1)
    }

    return res
  }

  generateId (method, params, opts) {
    return this.rpcId++
  }

  _handleMessage (message) {
    if (message instanceof ArrayBuffer) {
      message = Buffer.from(message).toString()
    }

    try {
      message = JSON.parse(message)
    } catch (error) {
      return
    }

    const {
      jsonrpc,
      id,
      params,
      method,
      result,
      error
    } = message

    if (jsonrpc !== '2.0') {
      return
    }

    if (method) {
      const args = Array.isArray(params) ? params : [params]
      const subscriptions = this.subscriptions[method] || []

      for (const sub of subscriptions) {
        sub(...args)
      }

      return
    }

    if (!this.queue[id]) {
      return
    }

    const {
      resolve,
      reject,
      timeout
    } = this.queue[id]

    if (timeout) {
      clearTimeout(timeout)
    }

    if (error) {
      reject(error)
    } else {
      resolve(result)
    }

    delete this.queue[id]
  }
}
