const metrics = require('@agencyhq/agency-metrics')
const express = require('express')
const log = require('loglevel')

const chai = require('chai')
const sinon = require('sinon')

const {
  main: sensor,
  rpc,
  handleRequest
} = require('../../src/sensor')

const { expect } = chai
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

const sandbox = sinon.createSandbox()

log.setLevel('warn')

describe('Cron Sensor', () => {
  afterEach(() => {
    delete process.env.METRICS
    delete process.env.PORT
    rpc.removeAllListeners()
    sandbox.restore()
  })

  it('should use metrics middleware if env variable is set', async () => {
    const middleware = Symbol('middleware')
    sandbox.stub(metrics, 'middleware').returns(middleware)
    sandbox.stub(express.application, 'listen').callsFake()
    sandbox.stub(express.application, 'post').callsFake()
    sandbox.stub(express.application, 'use').callsFake()
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(metrics, 'createServer').callsFake()

    process.env.METRICS = '1'
    process.env.PORT = '0000'

    await sensor()

    expect(express.application.use).to.be.calledWith(middleware)
    expect(express.application.listen).to.be.calledOnceWith('0000', sinon.match.func)
  })

  it('should connect to the API', async () => {
    sandbox.stub(express.application, 'listen').callsFake(async (port, fn) => {
      await fn()
    })
    sandbox.stub(express.application, 'post').callsFake()
    sandbox.stub(express.application, 'use').callsFake()
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'notify').callsFake()

    process.env.AGENCY_TOKEN = 'faketoken'

    await sensor()

    expect(rpc.connect).to.be.calledOnce
    expect(rpc.auth).to.be.calledOnceWith({ token: 'faketoken' })
    expect(express.application.post).to.be.calledOnceWith('*', handleRequest)
    expect(rpc.notify).to.be.calledOnceWith('ready')
  })

  it('should exit on disconnect from RPC', async () => {
    sandbox.stub(express.application, 'listen').callsFake()
    sandbox.stub(express.application, 'post').callsFake()
    sandbox.stub(express.application, 'use').callsFake()
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(process, 'exit').callsFake()

    await sensor()

    rpc.emit('disconnected')

    expect(process.exit).to.be.calledOnce
  })

  describe('#handleRequest()', () => {
    it('should emit a trigger', async () => {
      sandbox.stub(rpc, 'call').callsFake()

      const request = {
        path: '/',
        headers: [],
        query: {},
        body: ''
      }

      const response = {
        send: sandbox.stub()
      }

      await handleRequest(request, response)

      const eventShape = sinon.match({
        id: sinon.match.string,
        type: 'http',
        event: request
      })
      expect(rpc.call).to.be.calledOnceWith('trigger.emit', eventShape, { become: '*' })
      expect(response.send).to.be.calledOnceWith('OK')
    })
  })
})
