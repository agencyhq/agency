const models = require('../../models')
const pubsub = require('../../pubsub')

module.exports = async ({ id }) => {
  const mod = models.Rules.forge({ id })
  await mod.destroy()

  const rule = {
    id,
    deleted: true
  }

  await pubsub.publish('rule', rule)

  return rule
}
