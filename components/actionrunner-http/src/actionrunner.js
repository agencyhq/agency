const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const axios = require('axios').default
const log = require('loglevel')

log.setLevel(process.env.LOG_LEVEL || 'info')

const rpc = new RPC.Client(process.env.RPC_CONNECTION_STRING || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const {
  PORT = 3000,
  METRICS = false
} = process.env

if (METRICS) {
  metrics.createServer(PORT)
}

function httpAction (execution) {
  const { url, payload } = execution.parameters
  return axios.post(url, payload)
}

const ACTIONS = {
  http: httpAction
}

async function handleExecution (execution) {
  const { id } = execution
  log.debug('processing execution: %s', id)

  const action = ACTIONS[execution.action]
  if (!action) {
    return
  }

  const claim = await rpc.call('execution.claim', { id })
  metrics.countClaims(claim)

  if (!claim.granted) {
    log.debug(`claim denied: ${id}`)
    return
  }

  log.debug(`claim granted: ${id}`)

  const promise = action(execution)
  metrics.measureExecutionDuration(execution, promise)
  log.info('execution started: %s', id)
  rpc.notify('execution.started', { id })

  try {
    const { request, ...result } = await promise

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
  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: 'executiontoken' })

  await rpc.subscribe('execution', handleExecution)

  await rpc.notify('ready')
  log.info('ready to handle executions')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })
