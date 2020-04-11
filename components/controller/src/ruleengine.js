const amqp = require('amqplib')

const constants = require('./const')

const RULES = [{
  if: trigger => trigger.type === 'http' && trigger.event.type === 'e2e',
  then: trigger => ({
    action: 'http',
    url: trigger.event.url,
    payload: trigger.event.payload
  })
}]

;(async () => {
  const {
    TRIGGER_EXCHANGE_NAME,
    TRIGGER_EXCHANGE_TYPE,
    TRIGGER_EXCHANGE_OPTION,
    EXEC_EXCHANGE_NAME,
    EXEC_EXCHANGE_TYPE,
    EXEC_EXCHANGE_OPTION
  } = constants

  const conn = await amqp.connect('amqp://localhost')
  const channel = await conn.createChannel()
  await channel.assertExchange(TRIGGER_EXCHANGE_NAME, TRIGGER_EXCHANGE_TYPE, TRIGGER_EXCHANGE_OPTION)
  await channel.assertExchange(EXEC_EXCHANGE_NAME, EXEC_EXCHANGE_TYPE, EXEC_EXCHANGE_OPTION)

  const q = await channel.assertQueue('', { exclusive: true })
  channel.bindQueue(q.queue, TRIGGER_EXCHANGE_NAME, 'some')
  channel.consume(q.queue, msg => {
    const { trigger } = JSON.parse(msg.content.toString())
    console.log(" [ruleengine] %s:'%s'", msg.fields.routingKey, trigger)

    RULES.forEach(rule => {
      if (rule.if(trigger)) {
        const execution = rule.then(trigger)
        channel.publish(EXEC_EXCHANGE_NAME, 'some', Buffer.from(JSON.stringify(execution)))
      }
    })

    channel.ack(msg)
  })
})()
