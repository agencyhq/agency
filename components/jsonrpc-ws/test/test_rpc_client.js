/* eslint-disable no-unused-expressions */

const EventEmitter = require('events')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
const WS = require('ws')

const RPCClient = require('../lib/client')
const util = require('./util')

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(require('sinon-chai'))

const MOCK_TOKEN = 'deadbeef'

function promiseCalledMatching (match) {
  const fn = sinon.stub()

  fn.promise = new Promise(resolve => {
    fn.callsFake((...args) => { match(...args) && resolve() })
  })

  return fn
}

class WebSocket extends EventEmitter {
  constructor () {
    super()

    this.readyState = WS.CONNECTING

    this.on('open', () => {
      this.readyState = WS.OPEN
    })

    this.on('close', () => {
      this.readyState = WS.CLOSED
    })

    setImmediate(() => {
      this.emit('open')
    })
  }

  close () {
    setImmediate(() => {
      this.emit('close')
    })
  }

  send (json, opts, fn) {
    fn()
  }
}

describe('RPC Client', () => {
  let client

  beforeEach(() => {
    client = new RPCClient('http://example.com', { WebSocket })
  })

  afterEach(async () => {
    await client.close().catch(() => {})
  })

  describe('#constructor', () => {
    it('instantiates an object', () => {
      expect(client).to.be.an('object')
    })

    it('allows rewriting default callTimeout', async () => {
      client = new RPCClient('http://example.com', { WebSocket, callTimeout: 0 })
      await client.connect()

      const call = client.call('method')
      const timeout = util.wait(2000)

      await Promise.race([call, timeout])

      expect(call).not.to.be.fulfilled
      expect(call).not.to.be.rejected
      expect(timeout).to.be.fulfilled
    }).timeout(3000).slow(6000)
  })

  describe('#isConnected()', () => {
    it('returns false if not yet connected', () => {
      expect(client.isConnected()).to.be.false
    })

    it('returns true if connected', async () => {
      await client.connect()

      expect(client.isConnected()).to.be.true
    })

    it('returns false if already disconnected', async () => {
      await client.connect()
      await client.close()

      expect(client.isConnected()).to.be.false
    })
  })

  describe('#connect()', () => {
    it('should be in DISCONNECTED state initially', () => {
      expect(client.isConnected()).to.be.false
    })

    it('connects to the server', async () => {
      await client.connect()

      expect(client.isConnected()).to.be.true
    })

    it('emits connected event', async () => {
      const fn = sinon.fake()
      client.on('connected', fn)

      await client.connect()

      expect(fn).to.be.calledOnce
    })

    it('rejects when called on client that is already connected', async () => {
      await client.connect()

      await expect(client.connect()).to.be.rejectedWith('websocket already instantiated')
    })
  })

  describe('#close()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true
    })

    it('closes connection to the server', async () => {
      await client.close()

      expect(client.isConnected()).to.be.false
    })

    it('emits disconnected event', async () => {
      const fn = sinon.fake()
      client.on('disconnected', fn)

      await client.close()

      expect(fn).to.be.calledOnce
    })
  })

  describe('#auth()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true

      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        const { id } = JSON.parse(json)
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          result: {
            user: 'test',
            scopes: ['mock']
          }
        }))
      })
    })

    it('should have be unauthorized initially', () => {
      expect(client).to.have.property('authenticated', false)
    })

    it('should have no scopes initially', () => {
      expect(client).to.have.property('scopes').that.is.an('array').and.empty
    })

    it('authenticates client using provided token', async () => {
      await client.auth({ token: MOCK_TOKEN })

      expect(client).to.have.property('authenticated', true)
      expect(client).to.have.property('scopes')
      expect([...client.scopes]).to.have.members(['mock'])
    })

    it('emits authenticated event', async () => {
      const fn = sinon.fake()
      client.on('authenticated', fn)

      await client.auth({ token: MOCK_TOKEN })

      expect(fn).to.be.calledOnce
    })

    it('gracefully handles authentication as nonexitent user', async () => {
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        const { id } = JSON.parse(json)
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          result: false
        }))
      })

      await client.auth({ token: 'nonexitent' })

      expect(client).to.have.property('authenticated', false)
    })

    it('gracefully handles authentication as scopeless user', async () => {
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        const { id } = JSON.parse(json)
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          result: {
            user: 'test'
          }
        }))
      })

      await client.auth({ token: MOCK_TOKEN })

      expect(client).to.have.property('authenticated', true)
      expect(client).to.have.property('scopes')
      expect([...client.scopes]).not.to.have.members
    })
  })

  describe('#call()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true

      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
      })
    })

    it('makes a procedure call and returns a promise of the result', async () => {
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: 'some result'
        }))
      })

      const p = client.call('method', 'argument')

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.equal('some result')
      expect(client.ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'method',
        id: 1,
        params: 'argument'
      }))
    })

    it('allows to request procedure on behalf of other user', async () => {
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: 'some result'
        }))
      })

      const p = client.call('method', 'argument', { become: 'otheruser' })

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.equal('some result')
      expect(client.ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'method',
        id: 1,
        params: 'argument',
        'x-agency-become': 'otheruser'
      }))
    })

    it('does not send params when there is none provided', () => {
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: 'some result'
        }))
      })

      const p = client.call('method')

      expect(p).to.be.a('promise')
      expect(client.ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'method',
        id: 1
      }))
    })

    it('rejects promise on default timeout', async () => {
      const p = client.call('method', 'argument')

      expect(p).to.be.a('promise')
      await expect(p).to.be.rejectedWith('timeout')
    }).slow(3000)

    it('rejects promise on custom timeout', async () => {
      const p = client.call('method', 'argument', { timeout: 500 })

      expect(p).to.be.a('promise')
      await expect(p).to.be.rejectedWith('timeout')
    }).slow(1500)

    it('rejects promise on zero timeout', async () => {
      client.opts.callTimeout = 0
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: 'some result'
        }))
      })

      const p = client.call('method', 'argument', { timeout: 0 })

      expect(p).to.be.a('promise')
      await Promise.race([
        expect(p).to.not.be.rejectedWith('timeout'),
        util.wait(client.opts.callTimeout + 100)
      ])
    }).slow(3000)

    it('rejects promise of the result on error', async () => {
      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: 'total fail'
        }))
      })

      const p = client.call('method', 'argument')

      expect(p).to.be.a('promise')
      await expect(p).to.be.rejectedWith('total fail')
      expect(client.ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'method',
        id: 1,
        params: 'argument'
      }))
    })

    it('rejects if called on disconnected client', async () => {
      await client.close()

      await expect(client.call('method', 'argument')).to.be.rejectedWith('not connected')
    })

    it('rejects if send callback returns error', async () => {
      client.ws.send = sinon.spy((method, params, fn) => {
        fn('fail')
      })

      await expect(client.call('method', 'argument')).to.be.rejectedWith('fail')
    })
  })

  describe('#notify()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true

      client.ws.send = sinon.spy((json, opts, fn) => {
        fn()
      })
    })

    it('makes a notification', async () => {
      const p = client.notify('method', 'argument')

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.fulfilled
      expect(client.ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'method',
        params: 'argument'
      }))
    })

    it('makes a notification without params', async () => {
      const p = client.notify('method')

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.fulfilled
      expect(client.ws.send).to.be.calledOnceWith(JSON.stringify({
        jsonrpc: '2.0',
        method: 'method'
      }))
    })

    it('rejects if called on disconnected client', async () => {
      await client.close()

      await expect(client.notify('method', 'argument')).to.be.rejectedWith('not connected')
    })
  })

  describe('#subscribe()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true

      client.ws.send = sinon.spy((json, opts, fn) => {
        const req = JSON.parse(json)
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            test: 'ok',
            nonexistent: 'like really not ok mate'
          }
        }))
      })
    })

    it('should have no subscriptions', () => {
      expect(client).to.have.property('subscriptions').that.is.an('object').and.empty
    })

    it('subscribes to a notification', async () => {
      const fn = promiseCalledMatching(() => true)
      const res = await client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      await fn.promise

      expect(res).to.have.property('test', 'ok')
      await expect(fn.promise).to.eventually.be.fulfilled
      expect(fn).to.be.calledOnceWith('some notification')
    })

    it('properly handle notification of multiple arguments', async () => {
      const fn = promiseCalledMatching(() => true)
      const res = await client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: [1, 2, 3]
      }))

      await fn.promise

      expect(res).to.have.property('test', 'ok')
      await expect(fn.promise).to.eventually.be.fulfilled
      expect(fn).to.be.calledOnceWith(1, 2, 3)
    })

    it('subscribes to a notification multiple times', async () => {
      const fn1 = promiseCalledMatching(() => true)
      const fn2 = promiseCalledMatching(() => true)
      await client.subscribe('test', fn1)
      await client.subscribe('test', fn2)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      await Promise.all([
        fn1.promise,
        fn2.promise
      ])

      expect(fn1).to.be.calledOnceWith('some notification')
      expect(fn2).to.be.calledOnceWith('some notification')
    })

    it('subscribes to a notification repeatetly with the same handler', async () => {
      const fn = promiseCalledMatching(() => true)
      await client.subscribe('test', fn)
      await client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      await fn.promise

      // handler gets called only once
      expect(fn).to.be.calledOnceWith('some notification')
    })

    it('resubscribes to a notification', async () => {
      const fn = promiseCalledMatching(() => true)
      await client.subscribe('test', fn)
      await client.unsubscribe('test', fn)
      await client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      await fn.promise

      // handler gets called only once
      expect(fn).to.be.calledOnceWith('some notification')
    })

    it('should throw if unable to subscribe to notification', async () => {
      const fn = promiseCalledMatching(() => true)
      const promise = client.subscribe('nonexistent', fn)

      expect(promise).to.be.rejectedWith('like really not ok mate')
    })
  })

  describe('#unsubscribe()', () => {
    const testfn = () => {}

    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true

      client.ws.send = sinon.spy((json, opts, fn) => {
        const req = JSON.parse(json)
        fn()
        client.ws.emit('message', JSON.stringify({
          jsonrpc: '2.0',
          id: req.id,
          result: {
            test: 'ok'
          }
        }))
      })
    })

    it('unsubscribes from a notification', async () => {
      await client.subscribe('test', testfn)

      const res = await client.unsubscribe('test', testfn)

      expect(res).to.be.deep.equal({ test: 'ok' })
      expect(client.subscriptions.test).to.be.empty
    })

    it('unsubscribes from a notification repeatedly', async () => {
      await client.subscribe('test', testfn)

      const res1 = await client.unsubscribe('test', testfn)
      const res2 = await client.unsubscribe('test', testfn)

      expect(res1).to.be.deep.equal({ test: 'ok' })
      expect(res2).to.be.deep.equal({ test: 'ok' })
      expect(client.subscriptions.test).to.be.empty
    })

    it('unsubscribes before ever being subscribed', async () => {
      client.unsubscribe('test', testfn)

      expect(client.subscriptions.test).to.be.undefined
    })
  })

  describe('#ws.on("message")', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true
    })

    it('properly handles ArrayBuffer as a message', () => {
      client.ws.emit('message', new ArrayBuffer('{}'))
    })

    it('does nothing if the message is malformed', () => {
      const fn = sinon.spy(client, '_handleMessage')

      client.ws.emit('message', '{')

      expect(fn).to.be.calledOnce.and.returned(undefined)
    })

    it('does nothing if the message is not jsonrpc 2.0', () => {
      const fn = sinon.spy(client, '_handleMessage')

      client.ws.emit('message', JSON.stringify({
        method: 'test',
        params: 'some params'
      }))

      expect(fn).to.be.calledOnce.and.returned(undefined)
    })

    it('does nothing if there is no queue for the id', () => {
      const fn = sinon.spy(client, '_handleMessage')

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: 'some params'
      }))

      expect(fn).to.be.calledOnce.and.returned(undefined)
    })

    it('does nothing if receives notification with no subscriptions', () => {
      const fn = sinon.spy(client, '_handleMessage')

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      expect(fn).to.be.calledOnce.and.returned(undefined)
    })
  })
})
