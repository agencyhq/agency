const crypto = require('crypto')
const log = require('loglevel')
const pubsub = require('../pubsub')

log.setLevel(process.env.LOG_LEVEL || 'info')

const RULES = [{
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'e2e',
  then: trigger => ({
    id: crypto.randomBytes(16).toString('hex'),
    triggered_by: trigger.id,
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: trigger.event.body.payload
    }
  })
}, {
  if: trigger => trigger.type === 'http' && trigger.event.body.type === 'web',
  then: trigger => ({
    id: crypto.randomBytes(16).toString('hex'),
    triggered_by: trigger.id,
    created_at: new Date().toISOString(),
    action: 'http',
    parameters: {
      url: trigger.event.body.url,
      payload: trigger.event.body.payload
    }
  })
}]

async function main () {
  await pubsub.init()

  await pubsub.subscribe('trigger', msg => {
    const trigger = JSON.parse(msg.content.toString())
    log.info('processing %s: %s', msg.fields.routingKey, trigger.id)

    RULES.forEach(rule => {
      if (rule.if(trigger)) {
        log.info('found match for %s: %s', msg.fields.routingKey, trigger.id)
        const execution = rule.then(trigger)
        pubsub.publish('execution', execution)
      }
    })

    pubsub.channel.ack(msg)
  })
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })
