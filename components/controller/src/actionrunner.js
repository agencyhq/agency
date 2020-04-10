const amqp = require('amqplib')
const axios = require('axios').default

const constants = require('./const')

const {
  EXEC_EXCHANGE_NAME,
  EXEC_EXCHANGE_TYPE,
  EXEC_EXCHANGE_OPTION
} = constants

;(async () => {
  const conn = await amqp.connect('amqp://localhost')
  const channel = await conn.createChannel()
  const q = await channel.assertQueue('', { exclusive: true })
  await channel.assertExchange(EXEC_EXCHANGE_NAME, EXEC_EXCHANGE_TYPE, EXEC_EXCHANGE_OPTION)

  channel.bindQueue(q.queue, EXEC_EXCHANGE_NAME, 'some')

  channel.consume(q.queue, msg => {
    const execution = JSON.parse(msg.content.toString())
    console.log(" [actionexecutor] %s:'%s'", msg.fields.routingKey, execution)

    if (execution.action === 'http') {
      axios.post(execution.url, execution.payload)
    }

    channel.ack(msg)
  })
})()
