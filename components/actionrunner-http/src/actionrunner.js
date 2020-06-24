const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const axios = require('axios').default
const log = require('loglevel')

const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

function httpAction (execution) {
  const { url, payload } = execution.parameters
  return axios.post(url, payload)
}

const ACTIONS = {
  http: httpAction
}

async function handleExecution (execution) {
  const { id, user } = execution
  log.debug('processing execution: %s', id)

  const action = ACTIONS[execution.action]
  if (!action) {
    return
  }

  const claim = await rpc.call('execution.claim', { id }, { become: user })
  metrics.countClaims(claim)

  if (!claim.granted) {
    log.debug(`claim denied: ${id}`)
    return
  }

  log.debug(`claim granted: ${id}`)

  const promise = action(execution)
  metrics.measureExecutionDuration(execution, promise)
  log.info('execution started: %s', id)
  rpc.notify('execution.started', { id }, { become: user })

  try {
    const { request, ...result } = await promise

    log.info('execution completed successfully: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'succeeded',
      result
    }, { become: user })
  } catch (e) {
    log.info('execution failed: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'failed',
      result: e
    }, { become: user })
  }
}

async function main () {
  const {
    PORT = 3000,
    METRICS = false,
    AGENCY_TOKEN
  } = process.env

  if (METRICS) {
    metrics.createServer(PORT)
  }

  rpc.on('disconnected', () => {
    process.exit(1)
  })

  await rpc.connect()
  await rpc.auth({ token: AGENCY_TOKEN })

  await rpc.subscribe('execution', handleExecution)

  await rpc.notify('ready')
}

module.exports = {
  rpc,
  main,
  handleExecution,
  ACTIONS
}
