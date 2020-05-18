/* eslint-disable no-unused-expressions */

const EventEmitter = require('events')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const WS = require('ws')

const RPCClient = require('../lib/client')
const RPCServer = require('../lib/server')

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(require('sinon-chai'))

describe('E2E', () => {
  let client
  let server

  beforeEach(async () => {
    server = new RPCServer()
    const { address, port } = (await server.listen()).address()

    client = new RPCClient(`http://[${address}]:${port}`)
    await client.connect()
  })

  afterEach(async () => {
    await client.close().catch(() => {})
    await server.close().catch(() => {})
  })

  it('successfully connects', () => {
    expect(client.isConnected()).to.be.true
    expect(server.wss.clients).to.have.length(1)
  })

  it('handle client disconnecting first', async () => {
    await client.close()

    const serverClients = server.wss.clients

    expect(client.isConnected()).to.be.false
    expect(serverClients).to.have.length(1)
    expect(serverClients.values().next().value).to.have.property('readyState', WS.CLOSING)
  })

  it('handle server disconnecting first', async () => {
    await server.close()

    await EventEmitter.once(client.ws, 'close')
    expect(client.isConnected()).to.be.false
  })

  describe('Authentication', () => {
    it('allows to authenticate via rpc.login method', async () => {
      const token = 'sometoken'

      const res = await client.call('rpc.login', { token })

      expect(res).to.be.deep.equal({})
    })

    it('throws if no params passed to rpc.login', async () => {
      const p = client.call('rpc.login')

      await expect(p).to.be.rejectedWith('Params not found')
    })
  })

  describe('Method Call', () => {
    it('allows you to throw an error from method to get this perfect 100% coverage score', async () => {
      server.registerMethod('some', () => {
        throw server._createError(0)
      }, {
        scopes: ['any']
      })

      const res = client.call('some')

      expect(res).to.be.rejectedWith({
        error: {
          code: 0,
          message: 'Internal Server Error'
        },
        jsonrpc: '2.0'
      })
    })
  })
})
