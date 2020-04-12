const axios = require('axios').default
const log = require('loglevel')

const pubsub = require('../pubsub')

log.setLevel(process.env.LOG_LEVEL || 'info')

function httpAction (execution) {
  const { url, payload } = execution.parameters
  return axios.post(url, payload)
}

const ACTIONS = {
  http: httpAction
}

async function main () {
  await pubsub.init()

  pubsub.subscribe('execution', async msg => {
    const execution = JSON.parse(msg.content.toString())
    log.info('processing %s: %s', msg.fields.routingKey, execution.id)

    const action = ACTIONS[execution.action]
    if (!action) {
      return
    }

    const promise = action(execution)
    pubsub.channel.ack(msg)

    try {
      const { request, ...result } = await promise

      log.info('%s completed successfully: %s', msg.fields.routingKey, execution.id)

      pubsub.publish('result', {
        id: execution.id,
        status: 'succeeded',
        result
      })
    } catch (e) {
      log.info('%s failed: %s', msg.fields.routingKey, execution.id)

      pubsub.publish('result', {
        id: execution.id,
        status: 'failed',
        result: e
      })
    }
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })
