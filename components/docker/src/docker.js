const events = require('events')
const stream = require('stream')

const metrics = require('@agencyhq/agency-metrics')
const RPC = require('@agencyhq/jsonrpc-ws')
const Docker = require('dockerode')
const GetParams = require('mr-params').default
const log = require('loglevel')

const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

const ACTION_TYPE = 'docker.'

const getParams = GetParams()

const docker = new Docker()

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
    const methodName = action.substring(ACTION_TYPE.length)

    const args = []
    const method = docker[methodName]

    if (!method) {
      throw new Error('no such method')
    }

    for (const paramName of getParams(method)) {
      if (paramName === 'callback') {
        args.push(undefined)
      }

      args.push(parameters[paramName])
    }

    const promise = docker[methodName](...args)
    metrics.measureExecutionDuration(execution, promise)
    log.info('execution started: %s', id)
    rpc.notify('execution.started', { id })

    let result = await promise

    if (result instanceof stream.Stream) {
      const stream = result
      result = []

      stream.on('data', data => {
        const eventString = data.toString('utf8')
        try {
          result.push(JSON.parse(eventString))
        } catch (e) {
          result.push(eventString)
        }
      })

      await events.once(stream, 'end')
    }

    log.info('execution completed successfully: %s', execution.id)

    await rpc.call('execution.completed', {
      id: execution.id,
      status: 'succeeded',
      result
    })
  } catch (e) {
    log.info('execution failed: %s', execution.id)

    console.log(e)

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
  handleExecution
}
