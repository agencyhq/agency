const pubsub = require('./pubsub')

const RULES = [{
  if: trigger => trigger.type === 'http' && trigger.event.type === 'e2e',
  then: trigger => ({
    action: 'http',
    url: trigger.event.url,
    payload: trigger.event.payload
  })
}]

;(async () => {
  await pubsub.trigger.init()
  await pubsub.execution.init()

  await pubsub.trigger.subscribe('some', msg => {
    const { trigger } = JSON.parse(msg.content.toString())
    console.log(" [ruleengine] %s:'%s'", msg.fields.routingKey, trigger)

    RULES.forEach(rule => {
      if (rule.if(trigger)) {
        const execution = rule.then(trigger)
        pubsub.execution.publish('some', execution)
      }
    })

    pubsub.trigger.channel.ack(msg)
  })
})()
