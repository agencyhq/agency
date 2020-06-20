const crypto = require('crypto')

const express = require('express')
const log = require('loglevel')
const metrics = require('@agencyhq/agency-metrics')
const morgan = require('morgan')
const RPC = require('@agencyhq/jsonrpc-ws')
const { Octokit } = require('@octokit/rest')
const { Webhooks } = require('@octokit/webhooks')
const SmeeClient = require('smee-client')

const EVENT_TYPE = 'github'
const ACTION_TYPE = 'github.'

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')
metrics.instrumentRPCClient(rpc)

const octokit = new Octokit({})

async function handleWebhook (event) {
  const trigger = {
    id: crypto.randomBytes(16).toString('hex'),
    type: EVENT_TYPE,
    event
  }

  await rpc.call('trigger.emit', trigger)
}

async function handleExecution (execution) {
  const { id, action, parameters } = execution
  log.debug('processing execution: %s', id)

  if (!action.startsWith(ACTION_TYPE)) {
    return
  }

  const claim = await rpc.call('execution.claim', { id })
  metrics.countClaims(claim)

  if (!claim.granted) {
    log.debug(`claim denied: ${id}`)
    return
  }

  log.debug(`claim granted: ${id}`)

  try {
    const [, namespace, method] = action.split('.')

    const promise = octokit[namespace][method](parameters)
    metrics.measureExecutionDuration(execution, promise)
    log.info('execution started: %s', id)
    rpc.notify('execution.started', { id })

    const result = await promise

    log.info('execution completed successfully: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'succeeded',
      result
    })
  } catch (e) {
    log.info('execution failed: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'failed',
      result: e
    })
  }
}

async function main () {
  const {
    PORT = 3000,
    METRICS = false,
    AGENCY_TOKEN,
    WEBHOOK_PORT = PORT,
    WEBHOOK_PATH = '/',
    WEBHOOK_PROXY,
    WEBHOOK_SECRET
  } = process.env

  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: AGENCY_TOKEN })

  if (WEBHOOK_PROXY) {
    const smee = new SmeeClient({
      logger: log,
      source: WEBHOOK_PROXY,
      target: `http://localhost:${WEBHOOK_PORT}${WEBHOOK_PATH}`
    })
    smee.start()
  }

  const webhook = new Webhooks({
    path: WEBHOOK_PATH,
    secret: WEBHOOK_SECRET || 'secret'
  })

  webhook.on('*', handleWebhook)

  await rpc.subscribe('execution', handleExecution)

  const app = express()

  if (METRICS) {
    app.use(metrics.middleware({
      prefix: 'ifttt_github_http_'
    }))
  }
  app.use(express.json())
  app.use(morgan('short', {
    stream: {
      write: log.debug
    }
  }))

  app.use(webhook.middleware)

  await new Promise(resolve => app.listen(WEBHOOK_PORT, resolve))

  await rpc.notify('ready')
  log.info(`Listening on http://localhost:${WEBHOOK_PORT}`)
}

module.exports = {
  express,
  rpc,
  Webhooks,
  octokit,
  main,
  handleExecution,
  handleWebhook
}
