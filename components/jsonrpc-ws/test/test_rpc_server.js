/* eslint-disable no-unused-expressions */

const http = require('http')
const EventEmitter = require('events')
const path = require('path')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')

const RPCServer = require('../lib/server')

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(require('sinon-chai'))

class WS extends EventEmitter {
  constructor () {
    super()

    this.send = sinon.spy((message, opts, fn) => { fn && fn() })
  }
}

describe('RPC Server', () => {
  let server

  beforeEach(() => {
    server = new RPCServer()
  })

  afterEach(() => {
    return server.close()
      .catch(() => {})
  })

  describe('#constructor', () => {
    it('instantiates an object', () => {
      expect(server).to.be.an('object')
    })

    it('exposes provided server', () => {
      const opts = {
        server: http.createServer()
      }

      const server = new RPCServer(opts)

      expect(server).to.have.property('server', opts.server)
    })

    it('creates a new server if one is not provided', () => {
      const server = new RPCServer({})
      expect(server).to.have.property('server').that.is.not.undefined
    })

    it('allows to override authentication method', () => {
      const authenticate = sinon.spy(() => false)
      const server = new RPCServer({ authenticate })

      server.getAddress = () => 'http://localhost'

      const ws = new WS()
      server.wss.emit('connection', ws, { url: '/' }, { scopes: ['all'] })

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.login',
        params: { token: 'does not matter' },
        id: 1
      }))

      expect(server).to.have.property('authenticate').that.is.equal(authenticate)
      expect(authenticate).to.be.called.calledOnceWith({ token: 'does not matter' })
    })
  })

  describe('#getAddress()', () => {
    it('returns correct url when server returns IPv4', () => {
      server.server.address = () => ({
        family: 'IPv4',
        address: '127.0.0.1',
        port: 999
      })

      expect(server.getAddress()).to.be.equal('http://127.0.0.1:999')
    })

    it('returns correct url when server returns IPv6', () => {
      server.server.address = () => ({
        family: 'IPv6',
        address: '::1',
        port: 999
      })

      expect(server.getAddress()).to.be.equal('http://[::1]:999')
    })
  })

  describe('#listen()', () => {
    it('instructs server to start lisening for new connections', async () => {
      const p = server.listen(2999)

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.instanceOf(http.Server)
    })

    it('calls function when server is ready to listen', async () => {
      const fn = sinon.fake()

      await server.listen(2999, fn)

      expect(fn).to.be.calledOnce
        .and.to.have.nested.property('firstCall.args[0]')
        .that.is.instanceOf(http.Server)
    })

    it('emits listening event', async () => {
      const fn = sinon.fake()
      server.on('listening', fn)

      await server.listen(2999)

      expect(fn).to.be.calledOnceWith()
    })
  })

  describe('#close()', () => {
    beforeEach(async () => {
      await server.listen(2999)
    })

    it('instructs server to stop handling new connections', async () => {
      const p = server.close()

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.undefined
    })

    it('calls function when server stopped', async () => {
      const fn = sinon.fake()

      await server.close(fn)

      expect(fn).to.be.calledOnce
        .and.to.have.nested.property('firstCall.args[0]')
        .that.is.undefined
    })

    it('emits close event', async () => {
      const fn = sinon.fake()
      server.on('close', fn)

      await server.close()

      expect(fn).to.be.calledOnce
    })
  })

  describe('#registerMethod()', () => {
    it('should have no methods registered initially', () => {
      expect(server).to.have.property('methods').that.is.an('object').and.empty
    })

    it('registers a method', () => {
      const fn = () => {}
      server.registerMethod('test', fn, { metakey: true })

      expect(server).to.have.nested.property('methods.test.fn', fn)
      expect(server).to.have.nested.property('methods.test.metakey', true)
    })

    it('overrides method on repeated registration', () => {
      const fn = () => {}
      server.registerMethod('test', fn, { metakey: true })
      server.registerMethod('test', fn, { metakey: false })

      expect(server).to.have.nested.property('methods.test.fn', fn)
      expect(server).to.have.nested.property('methods.test.metakey', false)
    })

    it('throws an error if no method name is provided', () => {
      expect(() => server.registerMethod(undefined)).to.throw('expected method to be a string')
    })

    it('throws an error if no function provided', () => {
      expect(() => server.registerMethod('test')).to.throw()
      expect(() => server.registerMethod('test', {})).to.throw('expected fn to be a function')
    })

    it('throws an error if meta is not an object', () => {
      expect(() => server.registerMethod('test', () => {}, 1)).to.throw('expected meta to be an object')
    })

    it('overrides method on repeated registration', () => {
      const fn = () => {}
      server.registerMethod('test', fn, { metakey: true })
      server.registerMethod('test', fn, { metakey: false })

      expect(server).to.have.nested.property('methods.test.fn', fn)
      expect(server).to.have.nested.property('methods.test.metakey', false)
    })
  })

  describe('#deregisterMethod()', () => {
    beforeEach(() => {
      server.registerMethod('test', () => {})
    })

    it('deregisteres a method', () => {
      server.deregisterMethod('test')

      expect(server).to.not.have.nested.property('methods.test')
    })

    it('does nothing if method have not been previously registered', () => {
      const methods = { ...server.methods }
      server.deregisterMethod('test1')

      expect(server).to.have.deep.property('methods', methods)
    })

    it('throws an error if no method name is provided', () => {
      expect(() => server.deregisterMethod(undefined)).to.throw('expected method to be a string')
    })
  })

  describe('#registerNotification()', () => {
    it('should have no notifications registered initially', () => {
      expect(server).to.have.property('notifications').that.is.an('object').and.empty
    })

    it('registers a method', () => {
      server.registerNotification('test', { metakey: true })

      expect(server).to.have.nested.property('notifications.test.clients').that.is.empty
      expect(server).to.have.nested.property('notifications.test.scopes').that.is.empty
      expect(server).to.have.nested.property('notifications.test.metakey', true)
    })

    it('overrides notification on repeated registration', () => {
      server.registerNotification('test', { metakey: true })
      server.registerNotification('test', { metakey: false })

      expect(server).to.have.nested.property('notifications.test.clients').that.is.empty
      expect(server).to.have.nested.property('notifications.test.scopes').that.is.empty
      expect(server).to.have.nested.property('notifications.test.metakey', false)
    })

    it('throws an error if no notification name is provided', () => {
      expect(() => server.registerNotification(undefined)).to.throw('expected name to be a string')
    })

    it('throws an error if meta is not an object', () => {
      expect(() => server.registerNotification('test', 1)).to.throw('expected meta to be an object')
    })
  })

  describe('#deregisterNotification()', () => {
    beforeEach(() => {
      server.registerNotification('test', { metakey: true })
    })

    it('deregisteres a notification', () => {
      server.deregisterNotification('test')

      expect(server).to.not.have.nested.property('notifications.test')
    })

    it('does nothing if notification have not been previously registered', () => {
      const notifications = { ...server.notifications }
      server.deregisterNotification('test1')

      expect(server).to.have.deep.property('notifications', notifications)
    })

    it('throws an error if no method name is provided', () => {
      expect(() => server.deregisterNotification(undefined)).to.throw('expected name to be a string')
    })
  })

  describe('#registerSpec()', () => {
    it('loads the spec file and registers all the methods and events from it', () => {
      const operations = {
        ruleList: () => {}
      }

      server.registerSpec(
        path.join(__dirname, 'fixtures/basic.yaml'),
        opId => operations[opId] || (() => {})
      )

      expect(server.methods).to.have.property('rule.list')
      expect(server.methods['rule.list']).to.have.property('fn', operations.ruleList)
      expect(server.methods['rule.list']).to.have.deep.property('scopes', new Set(['rule']))

      expect(server.notifications).to.have.property('rule')
      expect(server.notifications.rule).to.have.deep.property('scopes', new Set(['rule']))
    })

    it('should try to resolve operation even when no operationId is provided', () => {
      const resolver = sinon.stub().returns(() => {})

      server.registerSpec(path.join(__dirname, 'fixtures/basic.yaml'), resolver)

      expect(server.methods).to.have.property('ready')
      expect(server.methods).to.have.property('rule.list')

      expect(resolver).to.be.calledTwice
      expect(resolver).to.be.calledWith(undefined)
      expect(resolver).to.be.calledWith('ruleList')
    })

    it('should throw if operation is not a function', () => {
      const fn = () =>
        server.registerSpec(path.join(__dirname, 'fixtures/basic.yaml'), () => {})

      expect(fn).to.throw('operationId should resolve to a function')
    })

    it('should throw when parsing unsupported version of the spec', () => {
      const fn = () =>
        server.registerSpec(path.join(__dirname, 'fixtures/bad_version.yaml'), () => {})

      expect(fn).to.throw('unsupported version of rpc spec')
    })

    it('should throw when parsing unsupported version of the spec', () => {
      const fn = () =>
        server.registerSpec(path.join(__dirname, 'fixtures/bad_version.yaml'), () => {})

      expect(fn).to.throw('unsupported version of rpc spec')
    })

    it('should throw when parsing invalid spec', () => {
      const fn = () =>
        server.registerSpec(path.join(__dirname, 'fixtures/invalid.yaml'), () => {})

      expect(fn).to.throw('spec validation failed')
    })
  })

  describe('#hasSubscribers()', () => {
    it('should return false if no one subscribed to the notification', () => {
      server.registerNotification('test')

      expect(server.hasSubscribers('test')).to.be.false
    })

    it('should return true if notification has subscribers', () => {
      server.registerNotification('test')

      server.notifications.test.clients.add('somebody')

      expect(server.hasSubscribers('test')).to.be.true
    })

    it('should return false if everyone unsubscribed from the notification', () => {
      server.registerNotification('test')

      server.notifications.test.clients.add('somebody')
      server.notifications.test.clients.delete('somebody')

      expect(server.hasSubscribers('test')).to.be.false
    })

    it('should throw if notification name is not a string', () => {
      expect(() => server.hasSubscribers(1)).to.throw('expected name to be a string')
    })

    it('should throw if notification is not registered', () => {
      expect(() => server.hasSubscribers('test')).to.throw('notification not registered')
    })
  })

  describe('#notify()', () => {
    let ws

    beforeEach(() => {
      server.registerNotification('test')

      ws = new WS()
      ws._user = 'testuser'
      ws._scopes = new Set()

      // mock subscriptions
      server.notifications.test.clients.add(ws)
    })

    it('sends notification to client', async () => {
      const res = await server.notify('test', 'some notification')

      expect(res).to.have.length(1)
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: 'some notification'
      }))
    })

    it('broadcast notification to every client subscribed', async () => {
      const ws2 = new WS()
      server.notifications.test.clients.add(ws2)

      const res = await server.notify('test', 'some notification')

      expect(res).to.have.length(2)
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: 'some notification'
      }))
      expect(ws2.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: 'some notification'
      }))
    })

    it('does not send notifications to clients outside the subscription', async () => {
      const ws2 = new WS()

      server.registerNotification('another')
      server.notifications.another.clients.add(ws2)

      const res = await server.notify('test', 'some notification')

      expect(res).to.have.length(1)
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: 'some notification'
      }))
      expect(ws2.send).to.not.be.called
    })

    it('sends notification to only one random client if option is provided', async () => {
      const ws2 = new WS()
      server.notifications.test.clients.add(ws2)

      const res = await server.notify('test', 'some notification', { random: true })

      expect(res).to.have.length(1)
      try {
        expect(ws.send).to.be.calledOnceWith(JSON.stringify({
          jsonrpc: '2.0',
          method: 'test',
          params: 'some notification'
        }))
        expect(ws2.send).to.not.be.called
      } catch (e) {
        expect(ws.send).to.not.be.called
        expect(ws2.send).to.be.calledOnceWith(JSON.stringify({
          jsonrpc: '2.0',
          method: 'test',
          params: 'some notification'
        }))
      }
    })

    it('sends notification to specific users if notification mentions a user', async () => {
      const ws2 = new WS()
      ws2._user = 'some'
      ws2._scopes = new Set()
      server.notifications.test.clients.add(ws2)

      const res = await server.notify('test', { user: 'some' })

      expect(res).to.have.length(1)
      expect(ws.send).to.not.be.called
      expect(ws2.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: {
          user: 'some'
        }
      }))
    })

    it('sends notification to service users if notification mentions a user', async () => {
      const ws2 = new WS()
      ws2._user = 'testuser'
      ws2._scopes = new Set([RPCServer._serviceScope])
      server.notifications.test.clients.add(ws2)

      const res = await server.notify('test', { user: 'some' })

      expect(res).to.have.length(1)
      expect(ws.send).to.not.be.called
      expect(ws2.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: {
          user: 'some'
        }
      }))
    })

    it('returns empty array if no users match notification user', async () => {
      const res = await server.notify('test', { user: 'some' })

      expect(res).to.have.length(0)
      expect(ws.send).to.not.be.called
    })

    it('throws an error if no notifications name is provided', async () => {
      await expect(server.notify(undefined)).to.be.rejectedWith('expected name to be a string')
    })

    it('throws an error if notifications with the name is not registered', async () => {
      server.deregisterNotification('test')

      await expect(server.notify('test')).to.be.rejectedWith('notification not registered')
    })
  })

  describe('#ws.on("message")', () => {
    let ws
    let method

    beforeEach(() => {
      server.getAddress = () => 'http://localhost'

      method = sinon.stub().returns('passed')
      server.registerMethod('test', method)

      server.registerNotification('test')
      server.registerNotification('secure', { scopes: ['some'] })

      ws = new WS()

      server.wss.emit('connection', ws, { url: '/' }, { scopes: ['all'] })
    })

    it('properly handles ArrayBuffer as a message', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', new ArrayBuffer('{}'))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
    })

    it('does nothing if the message is malformed', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', '{')

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: 'SyntaxError: Unexpected end of JSON input'
        }
      }))
    })

    it('runs method requested by message', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).to.be.calledOnceWith(['some params'])
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        result: 'passed',
        id: 1
      }))
    })

    it('replies on the message if method call throws', async () => {
      const handler = sinon.spy(server, '_handleRPC')
      server.registerMethod('test', () => { throw new Error('err') })

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Error',
          data: 'err'
        },
        id: 1
      }))
    })

    it('calls method but does not reply if message had no id to respond with', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params']
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).to.be.calledOnceWith(['some params'])
      expect(ws.send).to.not.be.called
    })

    it('handles messages in bulk if receives an array', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify([{
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        id: 1
      }, {
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        id: 2
      }]))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).to.be.calledTwice.and.calledWith(['some params'])
      expect(ws.send).to.be.calledOnceWith(JSON.stringify([{
        jsonrpc: '2.0',
        result: 'passed',
        id: 1
      }, {
        jsonrpc: '2.0',
        result: 'passed',
        id: 2
      }]))
    })

    it('replies to only messages in bulk that have id', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify([{
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        id: 1
      }, {
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params']
      }]))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).to.be.calledTwice.and.calledWith(['some params'])
      expect(ws.send).to.be.calledOnceWith(JSON.stringify([{
        jsonrpc: '2.0',
        result: 'passed',
        id: 1
      }]))
    })

    it('does not reply if all the messages in bulk have no id', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify([{
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params']
      }, {
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params']
      }]))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).to.be.calledTwice.and.calledWith(['some params'])
      expect(ws.send).to.not.be.called
    })

    it('returns error if receives empty bulk message', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify([]))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Invalid array'
        }
      }))
    })

    it('returns error if receives message that is not object', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify('msg'))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }))
    })

    it('returns error if receives message that is not jsonrpc 2.0', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        method: 'test',
        params: 'some params',
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Invalid JSON RPC version'
        },
        id: 1
      }))
    })

    it('returns error if receives message that has no method', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        params: 'some params',
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Invalid params',
          data: 'Method not specified'
        },
        id: 1
      }))
    })

    it('returns error if receives message that has method that is not a string', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 1,
        params: 'some params',
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Invalid method name'
        },
        id: 1
      }))
    })

    it('returns error if receives message that has method that is not registered', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'not registered',
        params: ['some params'],
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found'
        },
        id: 1
      }))
    })

    it('returns error if receives message that has parameters in form of string', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'not registered',
        params: 'some params',
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        },
        id: 1
      }))
    })

    it('returns error if client has no scopes', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws._scopes.delete('all')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32605,
          message: 'Method forbidden'
        },
        id: 1
      }))
    })

    it('subscribes client to notification', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.on',
        params: ['test'],
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        result: {
          test: 'ok'
        },
        id: 1
      }))
    })

    it('unsubscribes client from notification', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.on',
        params: ['test'],
        id: 1
      }))

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.off',
        params: ['test'],
        id: 2
      }))

      expect(handler).to.be.calledTwice
      await Promise.all(handler.returnValues)
      expect(ws.send).to.be.calledTwice.and.calledWith(JSON.stringify({
        jsonrpc: '2.0',
        result: {
          test: 'ok'
        },
        id: 2
      }))
    })

    it('subscribes and unsubscribes client from notification at once', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.on',
        params: ['test', 'none'],
        id: 1
      }))

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.off',
        params: ['test', 'none'],
        id: 2
      }))

      expect(handler).to.be.calledTwice
      await Promise.all(handler.returnValues)
      expect(ws.send).to.be.calledTwice
        .and.calledWith(JSON.stringify({
          jsonrpc: '2.0',
          result: {
            test: 'ok',
            none: 'notification is not registered'
          },
          id: 1
        }))
        .and.calledWith(JSON.stringify({
          jsonrpc: '2.0',
          result: {
            test: 'ok',
            none: 'notification is not registered'
          },
          id: 2
        }))
    })

    it('returns an error if no notification params provided', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.on',
        id: 1
      }))

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.off',
        id: 2
      }))

      expect(handler).to.be.calledTwice
      await Promise.all(handler.returnValues)
      expect(ws.send).to.be.calledTwice
        .and.calledWith(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Event not provided'
          },
          id: 1
        }))
        .and.calledWith(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Event not provided'
          },
          id: 2
        }))
    })

    it('returns an error if client does not have sufficient scopes for notification', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws._scopes.delete('all')

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'rpc.on',
        params: ['secure'],
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        result: {
          secure: 'notification forbidden'
        },
        id: 1
      }))
    })

    it('allows service user to make a request on behalf of other user', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws._user = 'original'
      ws._scopes = new Set(['all', 'service'])

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        'x-agency-become': 'otheruser',
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).to.be.calledOnce
      expect(method.getCall(0).args[0]).to.be.deep.equal(['some params'])
      expect(method.getCall(0).args[1]).to.have.property('user', 'otheruser')
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        result: 'passed',
        id: 1
      }))
    })

    it('prevents common users from spoofing username', async () => {
      const handler = sinon.spy(server, '_handleRPC')

      ws._user = 'original'
      ws._scopes = new Set(['all'])

      ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: ['some params'],
        'x-agency-become': 'otheruser',
        id: 1
      }))

      expect(handler).to.be.calledOnce
      await expect(handler.returnValues[0]).to.be.a('promise').fulfilled
      expect(method).not.to.be.calledOnce
      expect(ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -29001,
          message: 'Becoming is forbidden'
        },
        id: 1
      }))
    })
  })
})
