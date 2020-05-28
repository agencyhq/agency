const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id }, { user }) => {
  const query = { id, user }

  const mod = models.Rules.forge(query)
  await mod.destroy()

  const rule = {
    id,
    user,
    deleted: true
  }

  await pubsub.publish('rule', rule)

  return rule
}
