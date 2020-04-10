const amqp = require('amqplib')

const constants = require('./const')

const {
  TRIGGER_EXCHANGE_NAME,
  TRIGGER_EXCHANGE_TYPE,
  TRIGGER_EXCHANGE_OPTION,
  EXEC_EXCHANGE_NAME,
  EXEC_EXCHANGE_TYPE,
  EXEC_EXCHANGE_OPTION
} = constants

;(async () => {
  const conn = await amqp.connect('amqp://localhost')
  const channel = await conn.createChannel()
  const q = await channel.assertQueue('', { exclusive: true })

  await channel.assertExchange(TRIGGER_EXCHANGE_NAME, TRIGGER_EXCHANGE_TYPE, TRIGGER_EXCHANGE_OPTION)
  await channel.assertExchange(EXEC_EXCHANGE_NAME, EXEC_EXCHANGE_TYPE, EXEC_EXCHANGE_OPTION)

  channel.bindQueue(q.queue, TRIGGER_EXCHANGE_NAME, 'some')

  channel.consume(q.queue, msg => {
    const { trigger } = JSON.parse(msg.content.toString())
    console.log(" [ruleengine] %s:'%s'", msg.fields.routingKey, trigger)

    if (trigger.propagate) {
      channel.publish(EXEC_EXCHANGE_NAME, 'some', Buffer.from(JSON.stringify(trigger)))
    }

    if (trigger.type === 'http') {
      const { type: eventType, url, payload } = trigger.event || {}

      if (eventType === 'e2e') {
        const execution = {
          action: 'http',
          url,
          payload
        }

        channel.publish(EXEC_EXCHANGE_NAME, 'some', Buffer.from(JSON.stringify(execution)))
      }
    }

    channel.ack(msg)
  })
})()
