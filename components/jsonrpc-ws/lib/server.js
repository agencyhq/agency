const EventEmitter = require('events')
const http = require('http')
const url = require('url')
const uuid = require('uuid')

const WS = require('ws')

class RPCServer extends EventEmitter {
  _defaultUsername = 'anonymous'
  _anyScope = 'any'
  _allScope = 'all'

  constructor (opts) {
    super()

    const { server, authenticate, ...restOpts } = opts || {}

    this.server = server || http.createServer()
    this.authenticate = authenticate || this.authenticate
    this.methods = {}
    this.notifications = {}

    this.wss = new WS.Server({
      noServer: true,
      restOpts
    })

    this.wss.on('connection', (ws, req, client) => {
      this.emit('connection', ws, req, client)

      const {
        user = this._defaultUsername,
        scopes = []
      } = client || {}

      const requestURL = new url.URL(req.url, this.getAddress())

      ws._id = (requestURL.query || {}).socket_id || uuid.v1()
      ws._id = uuid.v1()
      ws._user = user + ''
      ws._scopes = new Set(scopes)

      ws.on('message', data => this._handleRPC(ws, client, data))
    })

    this.wss.on('error', (error) => this.emit('error', error))

    this.server.on('listening', () => this.emit('listening'))
    this.server.on('upgrade', (req, socket, head) => {
      // const client = this._authenticate(req)

      // if (!client) {
      //   socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      //   socket.destroy()
      //   return
      // }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req)
      })
    })
  }

  getAddress () {
    const { address, family, port } = this.server.address()

    if (family === 'IPv6') {
      return `http://[${address}]:${port}`
    } else {
      return `http://${address}:${port}`
    }
  }

  async listen (fn) {
    this.server.listen()

    await EventEmitter.once(this.server, 'listening')

    if (fn) {
      fn(this.server)
    }

    return this.server
  }

  close (fn) {
    return new Promise((resolve, reject) => {
      this.wss.close(() => {
        this.server.close(err => {
          if (fn) {
            fn(err)
          }

          this.emit('close')

          if (err) {
            reject(err)
          }

          return resolve()
        })
      })
    })
  }

  registerMethod (method, fn, meta = {}) {
    if (typeof method !== 'string') {
      throw new Error('expected method to be a string')
    }

    if (typeof fn !== 'function') {
      throw new Error('expected fn to be a function')
    }

    if (typeof meta !== 'object') {
      throw new Error('expected meta to be an object')
    }

    this.methods[method] = {
      ...meta,
      fn
    }
  }

  deregisterMethod (method) {
    if (typeof method !== 'string') {
      throw new Error('expected method to be a string')
    }

    delete this.methods[method]
  }

  registerNotification (name, meta = {}) {
    if (typeof name !== 'string') {
      throw new Error('expected name to be a string')
    }

    if (typeof meta !== 'object') {
      throw new Error('expected meta to be an object')
    }

    this.notifications[name] = {
      ...meta,
      clients: new Set(),
      scopes: new Set(meta.scopes || [])
    }
  }

  deregisterNotification (name) {
    if (typeof name !== 'string') {
      throw new Error('expected name to be a string')
    }

    delete this.notifications[name]
  }

  async notify (name, params, { random } = {}) {
    if (typeof name !== 'string') {
      throw new Error('expected name to be a string')
    }

    if (!this.notifications[name]) {
      throw new Error('notification not registered')
    }

    let clients = [...this.notifications[name].clients]

    if (random) {
      const index = Math.floor(Math.random() * clients.length)
      clients = [clients[index]]
    }

    const promises = []

    for (const ws of clients) {
      promises.push(new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          notification: name,
          params
        }), {}, () => resolve())
      }))
    }

    await Promise.all(promises)
  }

  authenticate () {
    return {}
  }

  async _handleRPC (ws, client, data) {
    const opts = {}

    if (data instanceof ArrayBuffer) {
      opts.binary = true

      data = Buffer.from(data).toString()
    }

    let parsedData

    try {
      parsedData = JSON.parse(data)
    } catch (error) {
      return ws.send(JSON.stringify(this._createError(-32700, error.toString())), opts)
    }

    if (Array.isArray(parsedData)) {
      if (!parsedData.length) {
        return ws.send(JSON.stringify(this._createError(-32600, 'Invalid array')), opts)
      }

      const responses = []

      for (const message of parsedData) {
        const response = await this._runMethod(message, ws)

        if (!response) {
          continue
        }

        responses.push(response)
      }

      if (!responses.length) {
        return
      }

      return ws.send(JSON.stringify(responses), opts)
    }

    const response = await this._runMethod(parsedData, ws)

    if (!response) {
      return
    }

    return ws.send(JSON.stringify(response), opts)
  }

  async _runMethod (message, ws) {
    if (typeof message !== 'object') {
      return this._createError(-32600)
    }

    const {
      jsonrpc,
      method,
      params,
      id
    } = message

    if (jsonrpc !== '2.0') {
      return {
        ...this._createError(-32600, 'Invalid JSON RPC version'),
        id
      }
    }

    if (!method) {
      return {
        ...this._createError(-32602, 'Method not specified'),
        id
      }
    }

    if (typeof method !== 'string') {
      return {
        ...this._createError(-32600, 'Invalid method name'),
        id
      }
    }

    if (params && typeof params === 'string') {
      return {
        ...this._createError(-32600),
        id
      }
    }

    const methods = {
      ...this.methods,
      'rpc.login': {
        fn: params => this._rpcLogin(params, ws),
        scopes: new Set(['any'])
      },
      'rpc.on': {
        fn: params => this._rpcSubscribe(params, ws),
        scopes: new Set(['any'])
      },
      'rpc.off': {
        fn: params => this._rpcUnsubscribe(params, ws),
        scopes: new Set(['any'])
      }
    }

    if (!methods[method]) {
      return {
        ...this._createError(-32601),
        id
      }
    }

    if (!this._matchPermissions(methods[method], ws)) {
      return {
        ...this._createError(-32605),
        id
      }
    }

    try {
      const result = await methods[method].fn(params, ws)

      return id && {
        jsonrpc: '2.0',
        result,
        id
      }
    } catch (err) {
      return id && {
        jsonrpc: '2.0',
        error: err instanceof Error
          ? {
            code: -32000,
            message: err.name,
            data: err.message
          }
          : err,
        id
      }
    }
  }

  _createError (code, details) {
    const errors = new Map([
      [-32000, 'Event not provided'],
      [-32600, 'Invalid Request'],
      [-32601, 'Method not found'],
      [-32602, 'Invalid params'],
      [-32603, 'Internal error'],
      [-32604, 'Params not found'],
      [-32605, 'Method forbidden'],
      [-32700, 'Parse error']
    ])

    const error = {
      code: code,
      message: errors.get(code) || 'Internal Server Error'
    }

    if (details) {
      error.data = details
    }

    return {
      jsonrpc: '2.0',
      error
    }
  }

  _rpcLogin (params, ws) {
    if (!params) {
      throw this._createError(-32604).error
    }

    const client = this.authenticate(params)

    if (client) {
      const {
        user = this._defaultUsername,
        scopes = []
      } = client

      ws._user = user + ''
      ws._scopes = new Set(scopes)
    }

    return client
  }

  _rpcSubscribe (params, ws) {
    if (!params) {
      throw this._createError(-32000).error
    }

    const results = {}

    for (const name of params) {
      if (!this.notifications[name]) {
        results[name] = 'notification is not registered'
        continue
      }

      if (!this._matchPermissions(this.notifications[name], ws)) {
        results[name] = 'notification forbidden'
        continue
      }

      this.notifications[name].clients.add(ws)

      results[name] = 'ok'
    }

    return results
  }

  _rpcUnsubscribe (params, ws) {
    if (!params) {
      throw this._createError(-32000).error
    }

    const results = {}

    for (const name of params) {
      if (!this.notifications[name]) {
        results[name] = 'notification is not registered'
        continue
      }

      this.notifications[name].clients.delete(ws)

      results[name] = 'ok'
    }

    return results
  }

  _matchPermissions (entity, ws) {
    const {
      scopes = new Set()
    } = entity

    const permissions = [this._allScope, ...scopes]
      .filter(x => new Set([...ws._scopes, this._anyScope]).has(x))

    return !!permissions.length
  }
}

module.exports = RPCServer
