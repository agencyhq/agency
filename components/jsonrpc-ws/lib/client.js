const EventEmitter = require('events')

const WS = require('ws')

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

class RPCClient extends EventEmitter {
  constructor (address, opts) {
    super()

    this.authenticated = false
    this.scopes = []
    this.subscriptions = {}
    this.rpcId = 1
    this.queue = {}

    this.address = address
    this.opts = {
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

    const { WebSocket = WS, opts } = this.opts

    this.ws = new WebSocket(this.address, opts)

    this.ws.on('message', m => this._handleMessage(m))

    await EventEmitter.once(this.ws, 'open')

    this.emit('connected')
  }

  async close () {
    if (!this.isConnected()) {
      return
    }

    this.ws.close()

    await EventEmitter.once(this.ws, 'close')

    this.emit('disconnected')
  }

  async auth () {
    this.authenticated = true
    this.scopes = ['mock']
    this.emit('authenticated')
  }

  async call (method, params, opts) {
    if (!this.isConnected()) {
      throw new Error('not connected')
    }

    const {
      timeout = this.opts.callTimeout
    } = opts || {}
    const id = this.generateId(method, params, opts)

    const { reject, promise } = this.queue[id] = deferred(timeout)

    const message = {
      jsonrpc: '2.0',
      method,
      id
    }

    if (params) {
      message.params = params
    }

    this.ws.send(JSON.stringify(message), {}, err => err && reject(err))

    const result = await promise

    return result
  }

  async subscribe (notification, fn) {
    if (!this.subscriptions[notification]) {
      this.subscriptions[notification] = []
    }

    const index = this.subscriptions[notification].indexOf(fn)

    if (index === -1) {
      this.subscriptions[notification] = this.subscriptions[notification].concat(fn)
    }
  }

  async unsubscribe (notification, fn) {
    if (!this.subscriptions[notification]) {
      return
    }

    const index = this.subscriptions[notification].indexOf(fn)

    if (index !== -1) {
      this.subscriptions[notification].splice(index, 1)
    }
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
      notification,
      result,
      error
    } = message

    if (jsonrpc !== '2.0') {
      return
    }

    if (notification) {
      const args = Array.isArray(params) ? params : [params]
      const subscriptions = this.subscriptions[notification] || []

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

module.exports = RPCClient
