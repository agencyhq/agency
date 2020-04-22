const axios = require('axios').default
const log = require('loglevel')

const rpc = require('../rpc/client')

log.setLevel(process.env.LOG_LEVEL || 'info')

function httpAction (execution) {
  const { url, payload } = execution.parameters
  return axios.post(url, payload)
}

const ACTIONS = {
  http: httpAction
}

async function main () {
  await rpc.connect()

  rpc.on('execution', async execution => {
    const { id } = execution
    log.info('processing execution: %s', id)

    const action = ACTIONS[execution.action]
    if (!action) {
      return
    }

    const claim = await rpc.call('execution.claim', { id })

    if (!claim.granted) {
      return
    }

    const promise = action(execution)

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
  })
  await rpc.subscribe('execution')
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })
