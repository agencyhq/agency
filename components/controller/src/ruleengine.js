const crypto = require('crypto')
const pubsub = require('./pubsub')

const RULES = [{
  if: trigger => trigger.type === 'http' && trigger.event.type === 'e2e',
  then: trigger => ({
    id: crypto.randomBytes(16).toString('hex'),
    triggered_by: trigger.id,
    action: 'http',
    parameters: {
      url: trigger.event.url,
      payload: trigger.event.payload
    }
  })
}]

async function main () {
  await pubsub.init()

  await pubsub.subscribe('trigger', msg => {
    const trigger = JSON.parse(msg.content.toString())
    console.log('%s:%s', msg.fields.routingKey, trigger.id)

    RULES.forEach(rule => {
      if (rule.if(trigger)) {
        const execution = rule.then(trigger)
        pubsub.publish('execution', execution)
      }
    })

    pubsub.channel.ack(msg)
  })
}

main()
  .catch(e => console.error(e))
