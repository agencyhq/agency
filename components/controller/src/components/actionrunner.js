const axios = require('axios').default
const log = require('loglevel')
const Prometheus = require('prom-client')

const metrics = require('../metrics')
const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3000,
  METRICS = false
} = process.env

if (METRICS) {
  metrics.createServer(PORT)
}

const claimsReceivedCounter = new Prometheus.Counter({
  name: 'ifttt_actionrunner_claims_received',
  help: 'Counter for number of claims granted from api',
  labelNames: ['status']
})

const executionDuration = new Prometheus.Histogram({
  name: 'ifttt_actionrunner_execution_duration',
  help: 'Duration of execution in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
  labelNames: ['action', 'status']
})

function httpAction (execution) {
  const { url, payload } = execution.parameters
  return axios.post(url, payload)
}

const ACTIONS = {
  http: httpAction
}

async function handleExecution (execution) {
  const { id } = execution
  log.info('processing execution: %s', id)

  const action = ACTIONS[execution.action]
  if (!action) {
    return
  }

  const claim = await rpc.call('execution.claim', { id })

  if (!claim.granted) {
    claimsReceivedCounter.inc({ status: 'denied' })
    return
  }
  claimsReceivedCounter.inc({ status: 'granted' })

  const executionDurationEnd = executionDuration.startTimer({ action: execution.action })
  const promise = action(execution)
  rpc.notify('execution.started', { id })

  try {
    const { request, ...result } = await promise

    executionDurationEnd({ status: 'succeeded' })
    log.info('execution completed successfully: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'succeeded',
      result
    })
  } catch (e) {
    executionDurationEnd({ status: 'failed' })
    log.info('execution failed: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'failed',
      result: e
    })
  }
}

async function main () {
  await rpc.connect()
  await rpc.auth({ token: 'alltoken' })

  await rpc.subscribe('execution', handleExecution)

  await rpc.notify('ready')
  log.info('ready to handle executions')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })
