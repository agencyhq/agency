const crypto = require('crypto')

const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async message => {
  // TODO: makes sense to attempt to prevalidate code before saving it
  const mod = models.Rules.forge({
    id: crypto.randomBytes(16).toString('hex'),
    // created_at: new Date().toISOString(),
    code: message.code
  })
  const rule = await mod.save(null, { method: 'insert' })
  await pubsub.publish('rule', rule)

  return rule
}
