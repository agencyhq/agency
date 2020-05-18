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

describe('RPC Client', () => {
  let client

  beforeEach(() => {
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

      send () {

      }
    }
    client = new RPCClient('http://example.com', { WebSocket })
  })

  afterEach(async () => {
    await client.close().catch(() => {})
  })

  describe('#constructor', () => {
    it('instantiates an object', () => {
      expect(client).to.be.an('object')
    })
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
    it('should have be unauthorized initially', () => {
      expect(client).to.have.property('authenticated', false)
    })

    it('should have no scopes initially', () => {
      expect(client).to.have.property('scopes').that.is.an('array').and.empty
    })

    it('authenticates client using provided token', async () => {
      await client.auth(MOCK_TOKEN)

      expect(client).to.have.property('authenticated', true)
      expect(client).to.have.property('scopes').that.has.members(['mock'])
    })

    it('emits authenticated event', async () => {
      const fn = sinon.fake()
      client.on('authenticated', fn)

      await client.auth(MOCK_TOKEN)

      expect(fn).to.be.calledOnce
    })
  })

  describe('#call()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true
    })

    it('makes a procedure call and returns a promise of the result', async () => {
      client.ws.send = sinon.spy(() => {
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

    it('does not send params when there is none provided', () => {
      client.ws.send = sinon.spy(() => {
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
      client.ws.send = sinon.spy(() => {
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
      client.ws.send = sinon.spy(() => {
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

  describe('#subscribe()', () => {
    beforeEach(async () => {
      const promise = client.connect()
      client.ws.emit('open')

      await expect(promise).to.eventually.be.fulfilled
      expect(client.isConnected()).to.be.true
    })

    it('should have no subscriptions', () => {
      expect(client).to.have.property('subscriptions').that.is.an('object').and.empty
    })

    it('subscribes to a notification', async () => {
      const fn = sinon.fake()
      const p = client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.undefined
      expect(fn).to.be.calledOnceWith('some notification')
    })

    it('properly handle notification of multiple arguments', async () => {
      const fn = sinon.fake()
      const p = client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: [1, 2, 3]
      }))

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.undefined
      expect(fn).to.be.calledOnceWith(1, 2, 3)
    })

    it('subscribes to a notification multiple times', async () => {
      const fn1 = sinon.fake()
      const fn2 = sinon.fake()
      client.subscribe('test', fn1)
      client.subscribe('test', fn2)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      expect(fn1).to.be.calledOnceWith('some notification')
      expect(fn2).to.be.calledOnceWith('some notification')
    })

    it('subscribes to a notification repeatetly with the same handler', async () => {
      const fn = sinon.fake()
      client.subscribe('test', fn)
      client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      // handler gets called only once
      expect(fn).to.be.calledOnceWith('some notification')
    })

    it('resubscribes to a notification', async () => {
      const fn = sinon.fake()
      client.subscribe('test', fn)
      client.unsubscribe('test', fn)
      client.subscribe('test', fn)

      client.ws.emit('message', JSON.stringify({
        jsonrpc: '2.0',
        notification: 'test',
        params: 'some notification'
      }))

      // handler gets called only once
      expect(fn).to.be.calledOnceWith('some notification')
    })
  })

  describe('#unsubscribe()', () => {
    const testfn = () => {}

    it('unsubscribes from a notification', async () => {
      await client.subscribe('test', testfn)

      const p = client.unsubscribe('test', testfn)

      expect(p).to.be.a('promise')
      await expect(p).to.eventually.be.undefined
      expect(client.subscriptions.test).to.be.empty
    })

    it('unsubscribes from a notification repeatedly', async () => {
      await client.subscribe('test', testfn)

      client.unsubscribe('test', testfn)
      client.unsubscribe('test', testfn)

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
