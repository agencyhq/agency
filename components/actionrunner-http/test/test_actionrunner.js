import metrics from '@agencyhq/agency-metrics'

import axios from 'axios'
import chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'

import {
  main as actionrunner,
  rpc,
  handleExecution,
  ACTIONS
} from '../src/actionrunner.js'

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(sinonChai)

const sandbox = sinon.createSandbox()

describe('Actionrunner', () => {
  afterEach(() => {
    delete process.env.METRICS
    delete process.env.PORT
    rpc.removeAllListeners()
    sandbox.restore()
  })

  it('should start metrics server if env variable is set', async () => {
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(metrics, 'createServer').callsFake()

    process.env.METRICS = '1'
    process.env.PORT = '0000'

    await actionrunner()

    expect(metrics.createServer).to.be.calledOnceWith('0000')
  })

  it('should connect to the API', async () => {
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    process.env.AGENCY_TOKEN = 'faketoken'

    await actionrunner()

    expect(rpc.connect).to.be.calledOnce
    expect(rpc.auth).to.be.calledOnceWith({ token: 'faketoken' })
    expect(rpc.subscribe).to.be.calledOnceWith('execution', handleExecution)
    expect(rpc.notify).to.be.calledOnceWith('ready')
  })

  it('should exit on disconnect from RPC', async () => {
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(process, 'exit').callsFake()

    await actionrunner()

    rpc.emit('disconnected')

    expect(process.exit).to.be.calledOnce
  })

  describe('#handleExecution()', () => {
    it('should attempt to claim execution of type `http`', async () => {
      sandbox.stub(rpc, 'call')
        .withArgs('execution.claim')
        .callsFake((method, args) => {
          return {
            granted: true
          }
        })
      sandbox.stub(rpc, 'notify').callsFake()

      sandbox.stub(ACTIONS, 'http').callsFake(async () => {
        return { a: 'b' }
      })

      await handleExecution({
        id: 'deadbeef',
        action: 'http',
        parameters: {
          url: 'some',
          payload: 'thing'
        }
      })

      expect(rpc.call).to.be.calledWith('execution.claim', {
        id: 'deadbeef'
      })
      expect(rpc.call).to.be.calledWith('execution.completed', {
        id: 'deadbeef',
        result: { a: 'b' },
        status: 'succeeded'
      })
      expect(rpc.notify).to.be.calledWith('execution.started', {
        id: 'deadbeef'
      })
    })

    it('should attempt to claim execution of type `http`', async () => {
      sandbox.stub(rpc, 'call')
        .withArgs('execution.claim')
        .callsFake((method, args) => {
          return {
            granted: true
          }
        })
      sandbox.stub(rpc, 'notify').callsFake()

      const err = new Error('everything went wrong')
      sandbox.stub(ACTIONS, 'http').callsFake(async () => {
        throw err
      })

      await handleExecution({
        id: 'deadbeef',
        action: 'http',
        parameters: {
          url: 'some',
          payload: 'thing'
        }
      })

      expect(rpc.call).to.be.calledWith('execution.claim', {
        id: 'deadbeef'
      })
      expect(rpc.call).to.be.calledWith('execution.completed', {
        id: 'deadbeef',
        result: err,
        status: 'failed'
      })
      expect(rpc.notify).to.be.calledWith('execution.started', {
        id: 'deadbeef'
      })
    })

    it('should do nothing if claim was denied', async () => {
      sandbox.stub(rpc, 'call')
        .withArgs('execution.claim')
        .callsFake((method, args) => {
          return {
            granted: false
          }
        })

      sandbox.stub(ACTIONS, 'http').callsFake(async () => {
        return { a: 'b' }
      })

      await handleExecution({
        id: 'deadbeef',
        action: 'http',
        parameters: {
          url: 'some',
          payload: 'thing'
        }
      })

      expect(rpc.call).to.be.calledWith('execution.claim', {
        id: 'deadbeef'
      })
      expect(ACTIONS.http).to.not.be.called
    })

    it('should do nothing if action is not present', async () => {
      sandbox.stub(rpc, 'call')

      await handleExecution({
        id: 'deadbeef',
        action: 'some-random-action'
      })

      expect(rpc.call).to.not.be.called
    })
  })

  describe('#httpAction()', () => {
    it('should make http request', async () => {
      sandbox.stub(axios, 'post').callsFake()

      await ACTIONS.http({
        parameters: {
          url: 'some',
          payload: 'thing'
        }
      })

      expect(axios.post).to.be.calledOnceWith('some', 'thing')
    })
  })
})
