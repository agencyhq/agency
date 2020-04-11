const axios = require('axios').default

const pubsub = require('./pubsub')

function httpAction (execution) {
  return axios.post(execution.url, execution.payload)
}

const ACTIONS = {
  http: httpAction
}

;(async () => {
  await pubsub.init()

  pubsub.subscribe('execution', async msg => {
    const execution = JSON.parse(msg.content.toString())
    console.log('%s:%s', msg.fields.routingKey, execution.id)

    const action = ACTIONS[execution.action]
    if (!action) {
      return
    }

    const promise = action(execution)
    pubsub.channel.ack(msg)

    const result = await promise

    delete result.request

    pubsub.publish('result', {
      id: execution.id,
      result
    })
  })
})()
