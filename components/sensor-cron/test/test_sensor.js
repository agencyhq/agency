const metrics = require('@agencyhq/agency-metrics')
const cron = require('node-cron')

const chai = require('chai')
const sinon = require('sinon')

const {
  main: sensor,
  rpc,
  handleTick
} = require('../src/sensor')

const { expect } = chai
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

const sandbox = sinon.createSandbox()

describe('Cron Sensor', () => {
  afterEach(() => {
    delete process.env.METRICS
    delete process.env.PORT
    rpc.removeAllListeners()
    sandbox.restore()
  })

  it('should start metrics server if env variable is set', async () => {
    sandbox.stub(cron, 'schedule').callsFake()
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(metrics, 'createServer').callsFake()

    process.env.METRICS = '1'
    process.env.PORT = '0000'

    await sensor()

    expect(metrics.createServer).to.be.calledOnceWith('0000')
  })

  it('should connect to the API', async () => {
    sandbox.stub(cron, 'schedule').callsFake()
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'notify').callsFake()

    process.env.AGENCY_TOKEN = 'faketoken'

    await sensor()

    expect(rpc.connect).to.be.calledOnce
    expect(rpc.auth).to.be.calledOnceWith({ token: 'faketoken' })
    expect(cron.schedule).to.be.calledOnceWith('* * * * *', handleTick)
    expect(rpc.notify).to.be.calledOnceWith('ready')
  })

  it('should exit on disconnect from RPC', async () => {
    sandbox.stub(cron, 'schedule').callsFake()
    sandbox.stub(rpc, 'connect').callsFake()
    sandbox.stub(rpc, 'auth').returns({})
    sandbox.stub(rpc, 'notify').callsFake()

    sandbox.stub(process, 'exit').callsFake()

    await sensor()

    rpc.emit('disconnected')

    expect(process.exit).to.be.calledOnce
  })

  describe('#handleTick()', () => {
    it('should emit a trigger', async () => {
      sandbox.stub(rpc, 'call').callsFake()

      await handleTick()

      const eventShape = sinon.match({
        id: sinon.match.string,
        type: 'cron',
        event: sinon.match({
          date: sinon.match.number,
          month: sinon.match.number,
          year: sinon.match.number,
          hours: sinon.match.number,
          minutes: sinon.match.number,
          iso: sinon.match.string
        })
      })
      expect(rpc.call).to.be.calledOnceWith('trigger.emit', eventShape, { become: '*' })
    })
  })
})
