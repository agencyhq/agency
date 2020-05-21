const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id, code }) => {
  // TODO: makes sense to attempt to prevalidate code before saving it
  const mod = models.Rules.forge({
    id,
    code
  })
  const rule = await mod.save({
    updated_at: new Date()
  }, {
    method: 'update'
  })
  await pubsub.publish('rule', rule)

  return rule
}
