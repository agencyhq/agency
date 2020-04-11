const amqp = require('amqplib')
const axios = require('axios').default

const constants = require('./const')

function httpAction (execution) {
  axios.post(execution.url, execution.payload)
}

const ACTIONS = {
  http: httpAction
}

;(async () => {
  const {
    EXEC_EXCHANGE_NAME,
    EXEC_EXCHANGE_TYPE,
    EXEC_EXCHANGE_OPTION
  } = constants

  const conn = await amqp.connect('amqp://localhost')
  const channel = await conn.createChannel()
  await channel.assertExchange(EXEC_EXCHANGE_NAME, EXEC_EXCHANGE_TYPE, EXEC_EXCHANGE_OPTION)

  const q = await channel.assertQueue('', { exclusive: true })
  channel.bindQueue(q.queue, EXEC_EXCHANGE_NAME, 'some')
  channel.consume(q.queue, msg => {
    const execution = JSON.parse(msg.content.toString())
    console.log(" [actionexecutor] %s:'%s'", msg.fields.routingKey, execution)

    const action = ACTIONS[execution.action]
    if (action) {
      action(execution)
      channel.ack(msg)
    }
  })
})()
