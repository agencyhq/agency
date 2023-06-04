import metrics from '@agencyhq/agency-metrics'
import cron from 'node-cron'

import chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'

import {
  main as sensor,
  rpc,
  handleTick
} from '../src/sensor.js'

const { expect } = chai
chai.use(chaiAsPromised)
chai.use(sinonChai)

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
