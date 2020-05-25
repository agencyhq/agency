const crypto = require('crypto')

const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async (message, { user, service }) => {
  // TODO: makes sense to attempt to prevalidate code before saving it
  const mod = models.Rules.forge({
    id: crypto.randomBytes(16).toString('hex'),
    code: message.code,
    user: service ? message.user : user
  })
  const rule = await mod.save(null, { method: 'insert' })
  await pubsub.publish('rule', rule)

  return rule
}
