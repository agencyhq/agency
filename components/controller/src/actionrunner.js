const axios = require('axios').default

const pubsub = require('./pubsub')

function httpAction (execution) {
  axios.post(execution.url, execution.payload)
}

const ACTIONS = {
  http: httpAction
}

;(async () => {
  await pubsub.execution.init()

  pubsub.execution.subscribe('some', msg => {
    const execution = JSON.parse(msg.content.toString())
    console.log(" [actionexecutor] %s:'%s'", msg.fields.routingKey, execution)

    const action = ACTIONS[execution.action]
    if (action) {
      action(execution)
      pubsub.execution.channel.ack(msg)
    }
  })
})()
