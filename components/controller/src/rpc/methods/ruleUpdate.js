const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async (query, { user: requestingUser, service }) => {
  // TODO: makes sense to attempt to prevalidate code before saving it

  if (!service) {
    query.user = requestingUser
  }

  const mod = models.Rules.forge(query)
  const rule = await mod.save({
    updated_at: new Date()
  }, {
    method: 'update'
  })
  await pubsub.publish('rule', rule)

  return rule
}
