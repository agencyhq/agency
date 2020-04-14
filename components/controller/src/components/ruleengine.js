const crypto = require('crypto')

const log = require('loglevel')
const { VM, VMScript } = require('vm2')

const models = require('../models')
const pubsub = require('../pubsub')

log.setLevel(process.env.LOG_LEVEL || 'info')

async function main () {
  await pubsub.init()

  const rules = await models.Rules
    .fetchAll()
    .map(rule => {
      return {
        ...rule.attributes,
        if: new VMScript(rule.get('if')),
        then: new VMScript(rule.get('then'))
      }
    })

  await pubsub.subscribe('trigger', msg => {
    const trigger = JSON.parse(msg.content.toString())
    log.info('processing %s: %s', msg.fields.routingKey, trigger.id)

    rules.forEach(rule => {
      const vm = new VM({
        timeout: 1000,
        sandbox: {
          trigger
        }
      })

      if (vm.run(rule.if)) {
        log.info('found match for %s: %s', msg.fields.routingKey, trigger.id)
        const { action, parameters = {} } = vm.run(rule.then)
        const execution = {
          id: crypto.randomBytes(16).toString('hex'),
          triggered_by: trigger.id,
          created_at: new Date().toISOString(),
          action,
          parameters
        }
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
