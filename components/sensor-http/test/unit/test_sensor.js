import metrics from '@agencyhq/agency-metrics'
import express from 'express'
import log from 'loglevel'

import chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'

import {
  main as sensor,
  rpc,
  handleRequest
} from '../../src/sensor.js'

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(sinonChai)

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
