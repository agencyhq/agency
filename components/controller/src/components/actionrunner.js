const axios = require('axios').default
const express = require('express')
const log = require('loglevel')
const promMid = require('express-prometheus-middleware')
const Prometheus = require('prom-client')

const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

const {
  PORT = 3000
} = process.env

const app = express()
app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true
}))
app.listen(PORT, () => {
  log.info(`Listening on http://localhost:${PORT}`)
})

const claimsReceivedCounter = new Prometheus.Counter({
  name: 'ifttt_actionrunner_claims_received',
  help: 'Counter for number of claims granted from api',
  labelNames: ['status']
})

const executionDuration = new Prometheus.Histogram({
  name: 'ifttt_actionrunner_execution_duration',
  help: 'Duration of execution in seconds',
  buckets: Prometheus.exponentialBuckets(Math.pow(10, -3), 10, 5),
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
  await rpc.connect('/execution')

  rpc.on('execution', handleExecution)
  await rpc.subscribe('execution')

  await rpc.notify('ready')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })
