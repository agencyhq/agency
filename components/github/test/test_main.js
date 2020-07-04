const chai = require('chai')
const sinon = require('sinon')

const log = require('loglevel')
const metrics = require('@agencyhq/agency-metrics')
const SmeeClient = require('smee-client')
const webhookMiddleware = require('@octokit/webhooks/src/middleware/middleware')

const {
  main: agent,
  express,
  rpc,
  octokit,
  handleExecution,
  handleWebhook
} = require('../src/github')

log.setLevel('error')

const { expect } = chai
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

const sandbox = sinon.createSandbox()

describe('Github Agent Main', () => {
  afterEach(() => {
    delete process.env.AGENCY_TOKEN
    delete process.env.PORT
    delete process.env.WEBHOOK_PROXY
    delete process.env.METRICS
    rpc.removeAllListeners()
    sandbox.restore()
  })

  it('should connect to the API', async () => {
    const boundMiddleware = Symbol('boundMiddleware')
    sandbox.stub(webhookMiddleware, 'bind').returns(boundMiddleware)
    sandbox.stub(express.application, 'use')
    sandbox.stub(express.application, 'listen')
      .callsFake((port, fn) => process.nextTick(fn))
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    process.env.AGENCY_TOKEN = 'faketoken'
    process.env.PORT = '9999'

    await agent()

    expect(rpc.connect).to.be.calledOnce
    expect(rpc.auth).to.be.calledOnceWith({ token: 'faketoken' })
    expect(rpc.subscribe).to.be.calledOnceWith('execution', handleExecution)
    expect(rpc.notify).to.be.calledOnceWith('ready')
    expect(express.application.use).to.be.calledWith(boundMiddleware)
    expect(express.application.listen).to.be.calledOnceWithExactly('9999', sinon.match.func)
  })

  it('should exit on disconnect from RPC', async () => {
    sandbox.stub(express.application, 'listen')
      .callsFake((port, fn) => process.nextTick(fn))
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(process, 'exit').callsFake()

    await agent()

    rpc.emit('disconnected')

    expect(process.exit).to.be.calledOnce
  })

  it('should start webhook proxy if env variable is set', async () => {
    sandbox.stub(SmeeClient.prototype, 'start')
    sandbox.stub(express.application, 'listen')
      .callsFake((port, fn) => process.nextTick(fn))
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    process.env.WEBHOOK_PROXY = 'https://smee.io/test'

    await agent()

    expect(SmeeClient.prototype.start).to.be.calledOnce
  })

  it('should enable metrics endpoint if env variable is set', async () => {
    const middleware = Symbol('middleware')
    sandbox.stub(metrics, 'middleware').returns(middleware)
    sandbox.stub(express.application, 'use')
    sandbox.stub(express.application, 'listen')
      .callsFake((port, fn) => process.nextTick(fn))
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'subscribe').callsFake()
    sandbox.stub(rpc, 'notify').callsFake()

    process.env.METRICS = '1'

    await agent()

    expect(express.application.use).to.be.calledWith(middleware)
  })

  describe('#handleExecution()', () => {
    it('should attempt to claim execution of type `github`', async () => {
      sandbox.stub(octokit.repos, 'list')
        .callsFake(async () => ({ repos: 'lotsa' }))
      sandbox.stub(rpc, 'call')
        .withArgs('execution.claim')
        .callsFake((method, args) => {
          return {
            granted: true
          }
        })
      sandbox.stub(rpc, 'notify').callsFake()

      await handleExecution({
        id: 'deadbeef',
        action: 'github.repos.list',
        parameters: {
          a: 'b'
        }
      })

      expect(octokit.repos.list).to.be.calledWith({
        a: 'b'
      })
      expect(rpc.call).to.be.calledWith('execution.claim', {
        id: 'deadbeef'
      })
      expect(rpc.call).to.be.calledWith('execution.completed', {
        id: 'deadbeef',
        result: {
          repos: 'lotsa'
        },
        status: 'succeeded'
      })
      expect(rpc.notify).to.be.calledWith('execution.started', {
        id: 'deadbeef'
      })
    })

    it('should report error when action throws', async () => {
      const err = new Error('everything went wrong')
      sandbox.stub(octokit.repos, 'list').returns(Promise.reject(err))
      sandbox.stub(rpc, 'call')
        .withArgs('execution.claim')
        .callsFake((method, args) => {
          return {
            granted: true
          }
        })
      sandbox.stub(rpc, 'notify').callsFake()

      await handleExecution({
        id: 'deadbeef',
        action: 'github.repos.list',
        parameters: {
          a: 'b'
        }
      })

      expect(octokit.repos.list).to.be.calledWith({
        a: 'b'
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

      sandbox.stub(octokit.repos, 'list')

      await handleExecution({
        id: 'deadbeef',
        action: 'github.repos.list',
        parameters: {
          a: 'b'
        }
      })

      expect(rpc.call).to.be.calledWith('execution.claim', {
        id: 'deadbeef'
      })
      expect(octokit.repos.list).to.not.be.called
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

  describe('#handleWebhook()', () => {
    it('should make http request', async () => {
      sandbox.stub(rpc, 'call')

      await handleWebhook({
        a: 'b'
      })

      expect(rpc.call).to.be.calledOnceWith('trigger.emit', {
        id: sinon.match.string,
        type: 'github',
        event: {
          a: 'b'
        }
      })
    })
  })
})
