import metrics from '@agencyhq/agency-metrics'
import RPC from '@agencyhq/jsonrpc-ws'
import axios from 'axios'
import log from 'loglevel'

export const rpc = new RPC.Client(process.env.AGENCY_URL || 'ws://localhost:3000/')

metrics.instrumentRPCClient(rpc)

/**
 * Generic type for a function representing an action
 * @template {unknown} TIN
 * @template {unknown} TOUT
 * @callback ExecutionHandler
 * @param {Execution<TIN>} execution
 * @returns {TOUT | Promise<TOUT>}
 */

/**
 * HTTP action making POST request to a url and sends a payload defined in the execition
 * @type {ExecutionHandler<HttpActionExecutionParameters, import('axios').AxiosResponse<any>>}
 */
export function httpAction (execution) {
  const { url, payload } = execution.parameters
  return axios.post(url, payload)
}

/**
 * List of all registered actions on this worker.
 * @type {Record<string, ExecutionHandler<unknown, unknown>>} ACTIONS
 */
export const ACTIONS = {
  http: httpAction
}

/**
 * Handler function for an `execution` RPC call.
 *
 * On incoming RPC call:
 * 1) makes sure the requested action is available or returns early if this actionrunner does not have this action
 * 2) makes a claim on the execution confirming that it can execute the requested action, returns early if claim has not been granted
 * 3) executes an action and notifies the core that the execution has been started
 * 4) waits for action to complete and reports the results or waits for it to fail and reports back the failure
 * @param {Execution<Record<string, unknown>>} execution
 */
export async function handleExecution (execution) {
  const { id, user } = execution
  log.debug('processing execution: %s', id)

  const action = ACTIONS[/** @type {keyof ACTIONS} */(execution.action)]
  if (!action) {
    return
  }

  const claim = /** @type {ExecutionClaim} */(await rpc.call('execution.claim', { id }, { become: user }))
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
    const { request, ...result } = /** @type {import('axios').AxiosResponse<any>} */(await promise)

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

/**
 * Main function that initializes actionrunner by establishing connection, authenticating, subscribes for RPC requests and reports readiness
 */
export async function main () {
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
