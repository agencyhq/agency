const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async (query, { user }) => {
  // TODO: makes sense to attempt to prevalidate code before saving it

  query.user = user

  const mod = models.Rules.forge(query)
  const rule = await mod.save({
    updated_at: new Date().toISOString()
  }, {
    method: 'update'
  })
  await pubsub.publish('rule', rule.toJSON())

  return rule.toJSON()
}
