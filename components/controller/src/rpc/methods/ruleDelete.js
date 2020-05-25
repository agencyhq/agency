const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id }, { user, service }) => {
  const query = { id }

  if (!service) {
    query.user = user
  }

  const mod = models.Rules.forge(query)
  await mod.destroy()

  const rule = {
    id,
    deleted: true
  }

  await pubsub.publish('rule', rule)

  return rule
}
